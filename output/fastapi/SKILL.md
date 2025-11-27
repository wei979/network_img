---
name: fastapi
description: FastAPI web framework documentation - async Python API development, dependency injection, automatic OpenAPI docs, and performance optimization
---

# Fastapi Skill

Comprehensive assistance with fastapi development, generated from official documentation.

## When to Use This Skill

This skill should be triggered when:
- Working with fastapi
- Asking about fastapi features or APIs
- Implementing fastapi solutions
- Debugging fastapi code
- Learning fastapi best practices

## Quick Reference

### Common Patterns

**Pattern 1:** For example:

```
pydantic>=2.7.0,<3.0.0
```

**Pattern 2:** The docs UI would also need the OpenAPI schema to declare that this API server is located at /api/v1 (behind the proxy). For example:

```
server
```

**Pattern 3:** For example:

```
async
```

**Pattern 4:** Info To use forms, first install python-multipart. Make sure you create a virtual environment, activate it, and then install it, for example: $ pip install python-multipart

```
python-multipart
```

**Pattern 5:** Make sure you create a virtual environment, activate it, and then install it, for example:

```
$ pip install python-multipart
```

**Pattern 6:** They are normally used to declare specific security permissions, for example:

```
users:read
```

**Pattern 7:** Let's start with a simple example:

```
def get_full_name(first_name, last_name):
    full_name = first_name.title() + " " + last_name.title()
    return full_name


print(get_full_name("john", "doe"))
```

**Pattern 8:** You can use, for example:

```
int
```

### Example Code Patterns

**Example 1** (python):
```python
from app.routers import items
```

**Example 2** (python):
```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Tomato"}
```

**Example 3** (python):
```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/items/")
def read_items():
    return ["plumbus", "portal gun"]
```

**Example 4** (python):
```python
@app.get('/')
async def read_results():
    results = await some_library()
    return results
```

## Reference Files

This skill includes comprehensive documentation in `references/`:

- **advanced.md** - Advanced documentation
- **api.md** - Api documentation
- **deployment.md** - Deployment documentation
- **tutorial.md** - Tutorial documentation

Use `view` to read specific reference files when detailed information is needed.

## Working with This Skill

### For Beginners
Start with the getting_started or tutorials reference files for foundational concepts.

### For Specific Features
Use the appropriate category reference file (api, guides, etc.) for detailed information.

### For Code Examples
The quick reference section above contains common patterns extracted from the official docs.

## Resources

### references/
Organized documentation extracted from official sources. These files contain:
- Detailed explanations
- Code examples with language annotations
- Links to original documentation
- Table of contents for quick navigation

### scripts/
Add helper scripts here for common automation tasks.

### assets/
Add templates, boilerplate, or example projects here.

## Notes

- This skill was automatically generated from official documentation
- Reference files preserve the structure and examples from source docs
- Code examples include language detection for better syntax highlighting
- Quick reference patterns are extracted from common usage examples in the docs

## Updating

To refresh this skill with updated documentation:
1. Re-run the scraper with the same configuration
2. The skill will be rebuilt with the latest information
