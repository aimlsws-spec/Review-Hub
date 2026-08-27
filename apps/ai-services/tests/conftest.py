import sys
from pathlib import Path

# Allow `from src...` imports when pytest is run from apps/ai-services.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
