import ast
import os


def check_nplus1(filepath):
    with open(filepath, "r") as f:
        try:
            tree = ast.parse(f.read())
        except Exception:
            return

    for node in ast.walk(tree):
        if isinstance(node, (ast.For, ast.While)):
            for child in ast.walk(node):
                if isinstance(child, ast.Call):
                    if isinstance(child.func, ast.Attribute):
                        if child.func.attr in (
                            "query",
                            "filter",
                            "filter_by",
                            "execute",
                        ):
                            print(
                                f"{filepath}:{child.lineno} - Possible N+1: {child.func.attr}() inside loop"
                            )


for root, _, files in os.walk("backend"):
    for file in files:
        if file.endswith(".py"):
            check_nplus1(os.path.join(root, file))
