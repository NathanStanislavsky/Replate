import os


def generate_selection_explanation(listing_id: int, selected_user_ids: list[int]) -> str:
    """
    Stub: return a short explanation of why these users were selected.
    Later: call Gemini API with listing + user stats to generate copy.
    """
    _ = listing_id, selected_user_ids
    if os.environ.get("GEMINI_API_KEY"):
        pass  # TODO: call Gemini
    return "Selection made via weighted lottery (fewer recent pickups = higher chance)."
