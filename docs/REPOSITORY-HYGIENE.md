# Generated Python artifacts and release hygiene

Python unit tests may create `__pycache__/` and `.pyc` files during local development. Those are interpreter-specific build products, not Slateframe theme source. Never commit or package them. Git ignores the common Python cache directories and bytecode suffixes; `.distignore` independently excludes them from the WordPress.org archive, including unexpected caches outside `tests/` and `bin/`.

`tests/test_repo_hygiene_contract.py` is discovered by the existing static-quality Python suite. It checks ignored examples, the Git index and HEAD tree, and an isolated rsync release fixture. It deliberately checks both index and HEAD: ignore patterns do not untrack already committed files. NUL-delimited Git output preserves CJK and unusual path names. Normal Python source remains allowed in development but is already excluded from the distributable via `bin/` and `tests/` rules.
