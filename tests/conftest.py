import os
import sys

_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_backend = os.path.join(_root, "backend")
sys.path.insert(0, _root)
if os.path.isdir(_backend):
    sys.path.insert(0, _backend)
