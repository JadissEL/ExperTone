"""
Graph Intelligence Engine for Expert–Company–Skill relationship mapping.
Powers 3D Knowledge Graph visualization.
"""

from typing import Any

import networkx as nx
import rustworkx as rx

from database import fetch_experts_for_graph

# Node types for react-force-graph
NODE_GROUP_EXPERT = "expert"
NODE_GROUP_COMPANY = "company"
NODE_GROUP_SKILL = "skill"

# Edge types
EDGE_WORKED_AT = "WORKED_AT"
EDGE_HAS_SKILL = "HAS_SKILL"
EDGE_ALUMNI = "ALUMNI"  # Expert–Company (same as WORKED_AT for visualization)
EDGE_SHARED_EMPLOYER = "SHARED_EMPLOYER"
EDGE_SAME_SUBINDUSTRY = "SAME_SUBINDUSTRY"
NODE_GROUP_INDUSTRY = "industry"


class GraphEngine:
    """
    Manages a directed knowledge graph of Experts, Companies, and Skills.
    Uses rustworkx.PyDiGraph for storage and centrality computation.
    """

    def __init__(self) -> None:
        self.graph: rx.PyDiGraph = rx.PyDiGraph()
        self._node_id_to_index: dict[str, int] = {}
        self._index_to_node: dict[int, dict[str, Any]] = {}
        self._centrality: dict[int, float] = {}
        self._communities: dict[str, int] = {}

    def build_knowledge_graph(self, limit: int = 500) -> None:
        """
        Pull experts and past employers from DB, build graph.
        Nodes: Expert, Company, Skill
        Edges: Worked_At, Has_Skill
        """
        self.graph = rx.PyDiGraph()
        self._node_id_to_index.clear()
        self._index_to_node.clear()

        experts = fetch_experts_for_graph(limit=limit)

        for ex in experts:
            expert_id = f"expert_{ex['id']}"
            if expert_id not in self._node_id_to_index:
                idx = self.graph.add_node(
                    {
                        "id": expert_id,
                        "label": ex["name"],
                        "group": NODE_GROUP_EXPERT,
                        "expert_id": ex["id"],
                    }
                )
                self._node_id_to_index[expert_id] = idx
                self._index_to_node[idx] = {
                    "id": expert_id,
                    "label": ex["name"],
                    "group": NODE_GROUP_EXPERT,
                }

            expert_idx = self._node_id_to_index[expert_id]

            # Past employers -> Company nodes, WORKED_AT edges
            for company in ex.get("past_employers") or []:
                if not company or not str(company).strip():
                    continue
                company_name = str(company).strip()
                company_id = f"company_{company_name.replace(' ', '_')}"
                if company_id not in self._node_id_to_index:
                    idx = self.graph.add_node(
                        {
                            "id": company_id,
                            "label": company_name,
                            "group": NODE_GROUP_COMPANY,
                        }
                    )
                    self._node_id_to_index[company_id] = idx
                    self._index_to_node[idx] = {
                        "id": company_id,
                        "label": company_name,
                        "group": NODE_GROUP_COMPANY,
                    }
                company_idx = self._node_id_to_index[company_id]
                self.graph.add_edge(expert_idx, company_idx, EDGE_WORKED_AT)

            # Skills -> Skill nodes, HAS_SKILL edges
            for skill in ex.get("skills") or []:
                if not skill or not str(skill).strip():
                    continue
                skill_name = str(skill).strip()
                skill_id = f"skill_{skill_name.replace(' ', '_')}"
                if skill_id not in self._node_id_to_index:
                    idx = self.graph.add_node(
                        {
                            "id": skill_id,
                            "label": skill_name,
                            "group": NODE_GROUP_SKILL,
                        }
                    )
                    self._node_id_to_index[skill_id] = idx
                    self._index_to_node[idx] = {
                        "id": skill_id,
                        "label": skill_name,
                        "group": NODE_GROUP_SKILL,
                    }
                skill_idx = self._node_id_to_index[skill_id]
                self.graph.add_edge(expert_idx, skill_idx, EDGE_HAS_SKILL)

            # Also use industry/sub_industry as implicit skills if no explicit skills
            if not ex.get("skills"):
                for industry in [ex.get("industry"), ex.get("sub_industry")]:
                    if industry and industry.strip():
                        skill_id = f"skill_{industry.replace(' ', '_')}"
                        if skill_id not in self._node_id_to_index:
                            idx = self.graph.add_node(
                                {
                                    "id": skill_id,
                                    "label": industry,
                                    "group": NODE_GROUP_SKILL,
                                }
                            )
                            self._node_id_to_index[skill_id] = idx
                            self._index_to_node[idx] = {
                                "id": skill_id,
                                "label": industry,
                                "group": NODE_GROUP_SKILL,
                            }
                        skill_idx = self._node_id_to_index[skill_id]
                        self.graph.add_edge(expert_idx, skill_idx, EDGE_HAS_SKILL)

        # Industry nodes: one per distinct industry/sub_industry
        for ex in experts:
            expert_id = f"expert_{ex['id']}"
            expert_idx_maybe = self._node_id_to_index.get(expert_id)
            if expert_idx_maybe is None:
                continue
            expert_idx = expert_idx_maybe
            for ind_name in [ex.get("industry"), ex.get("sub_industry")]:
                if not ind_name or not str(ind_name).strip():
                    continue
                ind_name = str(ind_name).strip()
                ind_id = f"industry_{ind_name.replace(' ', '_')}"
                if ind_id not in self._node_id_to_index:
                    idx = self.graph.add_node(
                        {
                            "id": ind_id,
                            "label": ind_name,
                            "group": NODE_GROUP_INDUSTRY,
                        }
                    )
                    self._node_id_to_index[ind_id] = idx
                    self._index_to_node[idx] = {
                        "id": ind_id,
                        "label": ind_name,
                        "group": NODE_GROUP_INDUSTRY,
                    }
                self.graph.add_edge(expert_idx, self._node_id_to_index[ind_id], "IN_INDUSTRY")

        # Expert–Expert edges: shared employer, same sub-industry
        expert_ids = [e["id"] for e in experts]
        employers_by_expert: dict[str, set[str]] = {}
        subind_by_expert: dict[str, str] = {}
        for ex in experts:
            employers_by_expert[ex["id"]] = {
                str(c).strip().lower() for c in (ex.get("past_employers") or []) if c
            }
            subind_by_expert[ex["id"]] = (ex.get("sub_industry") or "").strip().lower()

        for i, eid1 in enumerate(expert_ids):
            idx1 = self._node_id_to_index.get(f"expert_{eid1}")
            if idx1 is None:
                continue
            emp1 = employers_by_expert.get(eid1, set())
            sub1 = subind_by_expert.get(eid1)
            for eid2 in expert_ids[i + 1 :]:
                idx2 = self._node_id_to_index.get(f"expert_{eid2}")
                if idx2 is None:
                    continue
                if (
                    emp1
                    and employers_by_expert.get(eid2)
                    and emp1 & employers_by_expert.get(eid2, set())
                ):
                    self.graph.add_edge(idx1, idx2, EDGE_SHARED_EMPLOYER)
                    self.graph.add_edge(idx2, idx1, EDGE_SHARED_EMPLOYER)
                if sub1 and sub1 == subind_by_expert.get(eid2):
                    self.graph.add_edge(idx1, idx2, EDGE_SAME_SUBINDUSTRY)
                    self.graph.add_edge(idx2, idx1, EDGE_SAME_SUBINDUSTRY)

        self._compute_centrality()
        self._compute_communities()

    def _compute_centrality(self) -> None:
        """Compute PageRank for network influence score."""
        if self.graph.num_nodes() == 0:
            self._centrality = {}
            return
        try:
            scores = rx.pagerank(self.graph, alpha=0.85)
            self._centrality = dict(scores)
        except Exception:
            self._centrality = dict.fromkeys(range(self.graph.num_nodes()), 0.0)

    def _compute_communities(self) -> None:
        """Detect industry clusters using Louvain community detection."""
        if self.graph.num_nodes() == 0:
            self._communities = {}
            return
        try:
            # Convert to undirected NetworkX for Louvain
            g_undir = nx.Graph()
            for i in range(self.graph.num_nodes()):
                g_undir.add_node(i)
            for e in self.graph.edge_list():
                g_undir.add_edge(e[0], e[1])
            partition = nx.community.louvain_communities(g_undir, seed=42)
            self._communities = {}
            for cid, community in enumerate(partition):
                for n in community:
                    node_data = self.graph.get_node_data(n)
                    if node_data:
                        node_id = node_data.get("id", str(n))
                        self._communities[node_id] = cid
        except Exception:
            self._communities = {}

    def get_network_influence(self, expert_id: str) -> float:
        """
        Get centrality score for an expert (0–1 normalized).
        Used as Network Influence Score in ExpertRanker.
        """
        node_id = f"expert_{expert_id}"
        idx = self._node_id_to_index.get(node_id)
        if idx is None:
            return 0.0
        score = self._centrality.get(idx, 0.0)
        if not self._centrality:
            return 0.0
        max_val = max(self._centrality.values()) or 1.0
        return round(float(score / max_val), 4)

    def to_react_force_graph_format(self) -> dict[str, Any]:
        """
        Export graph as JSON for react-force-graph 3D.
        Nodes: id, label, group, val (size from centrality)
        Links: source, target, type
        """
        nodes = []
        for idx in range(self.graph.num_nodes()):
            data = self._index_to_node.get(idx, {})
            centrality = self._centrality.get(idx, 0.0)
            val = max(1, int(centrality * 50) + 1)  # size 1–50
            nodes.append(
                {
                    "id": data.get("id", str(idx)),
                    "label": data.get("label", str(idx)),
                    "group": data.get("group", "unknown"),
                    "val": val,
                    "community": self._communities.get(data.get("id", str(idx)), -1),
                }
            )

        links = []
        for edge in self.graph.weighted_edge_list():
            src, tgt = edge[0], edge[1]
            edge_data = edge[2] if len(edge) > 2 else EDGE_WORKED_AT
            edge_type = edge_data if isinstance(edge_data, str) else "WORKED_AT"
            src_id = self._index_to_node.get(src, {}).get("id", str(src))
            tgt_id = self._index_to_node.get(tgt, {}).get("id", str(tgt))
            # Map WORKED_AT -> ALUMNI for frontend (Expert–Company)
            link_type = (
                "ALUMNI"
                if edge_type == EDGE_WORKED_AT
                else (edge_type if edge_type == EDGE_HAS_SKILL else "ALUMNI")
            )
            links.append(
                {
                    "source": src_id,
                    "target": tgt_id,
                    "type": link_type,
                }
            )

        return {"nodes": nodes, "links": links}


def build_knowledge_graph(limit: int = 500) -> GraphEngine:
    """Convenience: build and return graph engine."""
    engine = GraphEngine()
    engine.build_knowledge_graph(limit=limit)
    return engine
