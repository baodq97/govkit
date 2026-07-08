"""Frozen training entrypoint EXP-0001 governs (and its reconciled: claim vouches for)."""

BASELINE = {"model": "lightgbm", "num_leaves": 63, "learning_rate": 0.05}


def train(exp: str, seeds: int) -> None:
    raise NotImplementedError("fixture stub — the governance corpus, not the lab, is under test")
