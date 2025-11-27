# Fastapi - Deployment

**Pages:** 3

---

## About FastAPI versions¶

**URL:** https://fastapi.tiangolo.com/deployment/versions/

**Contents:**
- About FastAPI versions¶
- Pin your fastapi version¶
- Available versions¶
- About versions¶
- Upgrading the FastAPI versions¶
- About Starlette¶
- About Pydantic¶

FastAPI is already being used in production in many applications and systems. And the test coverage is kept at 100%. But its development is still moving quickly.

New features are added frequently, bugs are fixed regularly, and the code is still continuously improving.

That's why the current versions are still 0.x.x, this reflects that each version could potentially have breaking changes. This follows the Semantic Versioning conventions.

You can create production applications with FastAPI right now (and you have probably been doing it for some time), you just have to make sure that you use a version that works correctly with the rest of your code.

The first thing you should do is to "pin" the version of FastAPI you are using to the specific latest version that you know works correctly for your application.

For example, let's say you are using version 0.112.0 in your app.

If you use a requirements.txt file you could specify the version with:

that would mean that you would use exactly the version 0.112.0.

Or you could also pin it with:

that would mean that you would use the versions 0.112.0 or above, but less than 0.113.0, for example, a version 0.112.2 would still be accepted.

If you use any other tool to manage your installations, like uv, Poetry, Pipenv, or others, they all have a way that you can use to define specific versions for your packages.

You can see the available versions (e.g. to check what is the current latest) in the Release Notes.

Following the Semantic Versioning conventions, any version below 1.0.0 could potentially add breaking changes.

FastAPI also follows the convention that any "PATCH" version change is for bug fixes and non-breaking changes.

The "PATCH" is the last number, for example, in 0.2.3, the PATCH version is 3.

So, you should be able to pin to a version like:

Breaking changes and new features are added in "MINOR" versions.

The "MINOR" is the number in the middle, for example, in 0.2.3, the MINOR version is 2.

You should add tests for your app.

With FastAPI it's very easy (thanks to Starlette), check the docs: Testing

After you have tests, then you can upgrade the FastAPI version to a more recent one, and make sure that all your code is working correctly by running your tests.

If everything is working, or after you make the necessary changes, and all your tests are passing, then you can pin your fastapi to that new recent version.

You shouldn't pin the version of starlette.

Different versions of FastAPI will use a specific newer version of Starlette.

So, you can just let FastAPI use the correct Starlette version.

Pydantic includes the tests for FastAPI with its own tests, so new versions of Pydantic (above 1.0.0) are always compatible with FastAPI.

You can pin Pydantic to any version above 1.0.0 that works for you.

**Examples:**

Example 1 (unknown):
```unknown
fastapi[standard]==0.112.0
```

Example 2 (unknown):
```unknown
fastapi[standard]>=0.112.0,<0.113.0
```

Example 3 (unknown):
```unknown
fastapi>=0.45.0,<0.46.0
```

Example 4 (unknown):
```unknown
pydantic>=2.7.0,<3.0.0
```

---

## Deployment¶

**URL:** https://fastapi.tiangolo.com/deployment/

**Contents:**
- Deployment¶
- What Does Deployment Mean¶
- Deployment Strategies¶

Deploying a FastAPI application is relatively easy.

To deploy an application means to perform the necessary steps to make it available to the users.

For a web API, it normally involves putting it in a remote machine, with a server program that provides good performance, stability, etc, so that your users can access the application efficiently and without interruptions or problems.

This is in contrast to the development stages, where you are constantly changing the code, breaking it and fixing it, stopping and restarting the development server, etc.

There are several ways to do it depending on your specific use case and the tools that you use.

You could deploy a server yourself using a combination of tools, you could use a cloud service that does part of the work for you, or other possible options.

I will show you some of the main concepts you should probably keep in mind when deploying a FastAPI application (although most of it applies to any other type of web application).

You will see more details to keep in mind and some of the techniques to do it in the next sections. ✨

---

## Run a Server Manually¶

**URL:** https://fastapi.tiangolo.com/deployment/manually/

**Contents:**
- Run a Server Manually¶
- Use the fastapi run Command¶
- ASGI Servers¶
- Server Machine and Server Program¶
- Install the Server Program¶
- Run the Server Program¶
- Deployment Concepts¶

In short, use fastapi run to serve your FastAPI application:

That would work for most of the cases. 😎

You could use that command for example to start your FastAPI app in a container, in a server, etc.

Let's go a little deeper into the details.

FastAPI uses a standard for building Python web frameworks and servers called ASGI. FastAPI is an ASGI web framework.

The main thing you need to run a FastAPI application (or any other ASGI application) in a remote server machine is an ASGI server program like Uvicorn, this is the one that comes by default in the fastapi command.

There are several alternatives, including:

There's a small detail about names to keep in mind. 💡

The word "server" is commonly used to refer to both the remote/cloud computer (the physical or virtual machine) and also the program that is running on that machine (e.g. Uvicorn).

Just keep in mind that when you read "server" in general, it could refer to one of those two things.

When referring to the remote machine, it's common to call it server, but also machine, VM (virtual machine), node. Those all refer to some type of remote machine, normally running Linux, where you run programs.

When you install FastAPI, it comes with a production server, Uvicorn, and you can start it with the fastapi run command.

But you can also install an ASGI server manually.

Make sure you create a virtual environment, activate it, and then you can install the server application.

For example, to install Uvicorn:

A similar process would apply to any other ASGI server program.

By adding the standard, Uvicorn will install and use some recommended extra dependencies.

That including uvloop, the high-performance drop-in replacement for asyncio, that provides the big concurrency performance boost.

When you install FastAPI with something like pip install "fastapi[standard]" you already get uvicorn[standard] as well.

If you installed an ASGI server manually, you would normally need to pass an import string in a special format for it to import your FastAPI application:

The command uvicorn main:app refers to:

Each alternative ASGI server program would have a similar command, you can read more in their respective documentation.

Uvicorn and other servers support a --reload option that is useful during development.

The --reload option consumes much more resources, is more unstable, etc.

It helps a lot during development, but you shouldn't use it in production.

These examples run the server program (e.g Uvicorn), starting a single process, listening on all the IPs (0.0.0.0) on a predefined port (e.g. 80).

This is the basic idea. But you will probably want to take care of some additional things, like:

I'll tell you more about each of these concepts, how to think about them, and some concrete examples with strategies to handle them in the next chapters. 🚀

**Examples:**

Example 1 (python):
```python
$ <font color="#4E9A06">fastapi</font> run <u style="text-decoration-style:solid">main.py</u>

  <span style="background-color:#009485"><font color="#D3D7CF"> FastAPI </font></span>  Starting production server 🚀

             Searching for package file structure from directories
             with <font color="#3465A4">__init__.py</font> files
             Importing from <font color="#75507B">/home/user/code/</font><font color="#AD7FA8">awesomeapp</font>

   <span style="background-color:#007166"><font color="#D3D7CF"> module </font></span>  🐍 main.py

     <span style="background-color:#007166"><font color="#D3D7CF"> code </font></span>  Importing the FastAPI app object from the module with
             the following code:

             <u style="text-decoration-style:solid">from </u><u style="text-decoration-style:solid"><b>main</b></u><u style="text-decoration-style:solid"> import </u><u style="text-decoration-style:solid"><b>app</b></u>

      <span style="background-color:#007166"><font color="#D3D7CF"> app </font></span>  Using import string: <font color="#3465A4">main:app</font>

   <span style="background-color:#007166"><font color="#D3D7CF"> server </font></span>  Server started at <font color="#729FCF"><u style="text-decoration-style:solid">http://0.0.0.0:8000</u></font>
   <span style="background-color:#007166"><font color="#D3D7CF"> server </font></span>  Documentation at <font color="#729FCF"><u style="text-decoration-style:solid">http://0.0.0.0:8000/docs</u></font>

             Logs:

     <span style="background-color:#007166"><font color="#D3D7CF"> INFO </font></span>  Started server process <b>[</b><font color="#34E2E2"><b>2306215</b></font><b>]</b>
     <span style="background-color:#007166"><font color="#D3D7CF"> INFO </font></span>  Waiting for application startup.
     <span style="background-color:#007166"><font color="#D3D7CF"> INFO </font></span>  Application startup complete.
     <span style="background-color:#007166"><font color="#D3D7CF"> INFO </font></span>  Uvicorn running on <font color="#729FCF"><u style="text-decoration-style:solid">http://0.0.0.0:8000</u></font> <b>(</b>Press CTRL+C
             to quit<b>)</b>
```

Example 2 (unknown):
```unknown
$ pip install "uvicorn[standard]"

---> 100%
```

Example 3 (unknown):
```unknown
$ uvicorn main:app --host 0.0.0.0 --port 80

<span style="color: green;">INFO</span>:     Uvicorn running on http://0.0.0.0:80 (Press CTRL+C to quit)
```

Example 4 (python):
```python
from main import app
```

---
