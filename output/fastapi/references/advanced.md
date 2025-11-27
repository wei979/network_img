# Fastapi - Advanced

**Pages:** 15

---

## Advanced Dependencies¶

**URL:** https://fastapi.tiangolo.com/advanced/advanced-dependencies

**Contents:**
- Advanced Dependencies¶
- Parameterized dependencies¶
- A "callable" instance¶
- Parameterize the instance¶
- Create an instance¶
- Use the instance as a dependency¶
- Dependencies with yield, HTTPException, except and Background Tasks¶
  - Dependencies with yield and StreamingResponse, Technical Details¶
    - Use Cases with Early Exit Code¶
  - Dependencies with yield and except, Technical Details¶

All the dependencies we have seen are a fixed function or class.

But there could be cases where you want to be able to set parameters on the dependency, without having to declare many different functions or classes.

Let's imagine that we want to have a dependency that checks if the query parameter q contains some fixed content.

But we want to be able to parameterize that fixed content.

In Python there's a way to make an instance of a class a "callable".

Not the class itself (which is already a callable), but an instance of that class.

To do that, we declare a method __call__:

Prefer to use the Annotated version if possible.

In this case, this __call__ is what FastAPI will use to check for additional parameters and sub-dependencies, and this is what will be called to pass a value to the parameter in your path operation function later.

And now, we can use __init__ to declare the parameters of the instance that we can use to "parameterize" the dependency:

Prefer to use the Annotated version if possible.

In this case, FastAPI won't ever touch or care about __init__, we will use it directly in our code.

We could create an instance of this class with:

Prefer to use the Annotated version if possible.

And that way we are able to "parameterize" our dependency, that now has "bar" inside of it, as the attribute checker.fixed_content.

Then, we could use this checker in a Depends(checker), instead of Depends(FixedContentQueryChecker), because the dependency is the instance, checker, not the class itself.

And when solving the dependency, FastAPI will call this checker like:

...and pass whatever that returns as the value of the dependency in our path operation function as the parameter fixed_content_included:

Prefer to use the Annotated version if possible.

All this might seem contrived. And it might not be very clear how is it useful yet.

These examples are intentionally simple, but show how it all works.

In the chapters about security, there are utility functions that are implemented in this same way.

If you understood all this, you already know how those utility tools for security work underneath.

You most probably don't need these technical details.

These details are useful mainly if you had a FastAPI application older than 0.118.0 and you are facing issues with dependencies with yield.

Dependencies with yield have evolved over time to account for the different use cases and to fix some issues, here's a summary of what has changed.

Before FastAPI 0.118.0, if you used a dependency with yield, it would run the exit code after the path operation function returned but right before sending the response.

The intention was to avoid holding resources for longer than necessary, waiting for the response to travel through the network.

This change also meant that if you returned a StreamingResponse, the exit code of the dependency with yield would have been already run.

For example, if you had a database session in a dependency with yield, the StreamingResponse would not be able to use that session while streaming data because the session would have already been closed in the exit code after yield.

This behavior was reverted in 0.118.0, to make the exit code after yield be executed after the response is sent.

As you will see below, this is very similar to the behavior before version 0.106.0, but with several improvements and bug fixes for corner cases.

There are some use cases with specific conditions that could benefit from the old behavior of running the exit code of dependencies with yield before sending the response.

For example, imagine you have code that uses a database session in a dependency with yield only to verify a user, but the database session is never used again in the path operation function, only in the dependency, and the response takes a long time to be sent, like a StreamingResponse that sends data slowly, but for some reason doesn't use the database.

In this case, the database session would be held until the response is finished being sent, but if you don't use it, then it wouldn't be necessary to hold it.

Here's how it could look like:

The exit code, the automatic closing of the Session in:

...would be run after the the response finishes sending the slow data:

But as generate_stream() doesn't use the database session, it is not really necessary to keep the session open while sending the response.

If you have this specific use case using SQLModel (or SQLAlchemy), you could explicitly close the session after you don't need it anymore:

That way the session would release the database connection, so other requests could use it.

If you have a different use case that needs to exit early from a dependency with yield, please create a GitHub Discussion Question with your specific use case and why you would benefit from having early closing for dependencies with yield.

If there are compelling use cases for early closing in dependencies with yield, I would consider adding a new way to opt in to early closing.

Before FastAPI 0.110.0, if you used a dependency with yield, and then you captured an exception with except in that dependency, and you didn't raise the exception again, the exception would be automatically raised/forwarded to any exception handlers or the internal server error handler.

This was changed in version 0.110.0 to fix unhandled memory consumption from forwarded exceptions without a handler (internal server errors), and to make it consistent with the behavior of regular Python code.

Before FastAPI 0.106.0, raising exceptions after yield was not possible, the exit code in dependencies with yield was executed after the response was sent, so Exception Handlers would have already run.

This was designed this way mainly to allow using the same objects "yielded" by dependencies inside of background tasks, because the exit code would be executed after the background tasks were finished.

This was changed in FastAPI 0.106.0 with the intention to not hold resources while waiting for the response to travel through the network.

Additionally, a background task is normally an independent set of logic that should be handled separately, with its own resources (e.g. its own database connection).

So, this way you will probably have cleaner code.

If you used to rely on this behavior, now you should create the resources for background tasks inside the background task itself, and use internally only data that doesn't depend on the resources of dependencies with yield.

For example, instead of using the same database session, you would create a new database session inside of the background task, and you would obtain the objects from the database using this new session. And then instead of passing the object from the database as a parameter to the background task function, you would pass the ID of that object and then obtain the object again inside the background task function.

**Examples:**

Example 1 (python):
```python
from typing import Annotated

from fastapi import Depends, FastAPI

app = FastAPI()


class FixedContentQueryChecker:
    def __init__(self, fixed_content: str):
        self.fixed_content = fixed_content

    def __call__(self, q: str = ""):
        if q:
            return self.fixed_content in q
        return False


checker = FixedContentQueryChecker("bar")


@app.get("/query-checker/")
async def read_query_check(fixed_content_included: Annotated[bool, Depends(checker)]):
    return {"fixed_content_in_query": fixed_content_included}
```

Example 2 (python):
```python
from fastapi import Depends, FastAPI
from typing_extensions import Annotated

app = FastAPI()


class FixedContentQueryChecker:
    def __init__(self, fixed_content: str):
        self.fixed_content = fixed_content

    def __call__(self, q: str = ""):
        if q:
            return self.fixed_content in q
        return False


checker = FixedContentQueryChecker("bar")


@app.get("/query-checker/")
async def read_query_check(fixed_content_included: Annotated[bool, Depends(checker)]):
    return {"fixed_content_in_query": fixed_content_included}
```

Example 3 (python):
```python
from fastapi import Depends, FastAPI

app = FastAPI()


class FixedContentQueryChecker:
    def __init__(self, fixed_content: str):
        self.fixed_content = fixed_content

    def __call__(self, q: str = ""):
        if q:
            return self.fixed_content in q
        return False


checker = FixedContentQueryChecker("bar")


@app.get("/query-checker/")
async def read_query_check(fixed_content_included: bool = Depends(checker)):
    return {"fixed_content_in_query": fixed_content_included}
```

Example 4 (python):
```python
from typing import Annotated

from fastapi import Depends, FastAPI

app = FastAPI()


class FixedContentQueryChecker:
    def __init__(self, fixed_content: str):
        self.fixed_content = fixed_content

    def __call__(self, q: str = ""):
        if q:
            return self.fixed_content in q
        return False


checker = FixedContentQueryChecker("bar")


@app.get("/query-checker/")
async def read_query_check(fixed_content_included: Annotated[bool, Depends(checker)]):
    return {"fixed_content_in_query": fixed_content_included}
```

---

## Async Tests¶

**URL:** https://fastapi.tiangolo.com/advanced/async-tests/

**Contents:**
- Async Tests¶
- pytest.mark.anyio¶
- HTTPX¶
- Example¶
- Run it¶
- In Detail¶
- Other Asynchronous Function Calls¶

You have already seen how to test your FastAPI applications using the provided TestClient. Up to now, you have only seen how to write synchronous tests, without using async functions.

Being able to use asynchronous functions in your tests could be useful, for example, when you're querying your database asynchronously. Imagine you want to test sending requests to your FastAPI application and then verify that your backend successfully wrote the correct data in the database, while using an async database library.

Let's look at how we can make that work.

If we want to call asynchronous functions in our tests, our test functions have to be asynchronous. AnyIO provides a neat plugin for this, that allows us to specify that some test functions are to be called asynchronously.

Even if your FastAPI application uses normal def functions instead of async def, it is still an async application underneath.

The TestClient does some magic inside to call the asynchronous FastAPI application in your normal def test functions, using standard pytest. But that magic doesn't work anymore when we're using it inside asynchronous functions. By running our tests asynchronously, we can no longer use the TestClient inside our test functions.

The TestClient is based on HTTPX, and luckily, we can use it directly to test the API.

For a simple example, let's consider a file structure similar to the one described in Bigger Applications and Testing:

The file main.py would have:

The file test_main.py would have the tests for main.py, it could look like this now:

You can run your tests as usual via:

The marker @pytest.mark.anyio tells pytest that this test function should be called asynchronously:

Note that the test function is now async def instead of just def as before when using the TestClient.

Then we can create an AsyncClient with the app, and send async requests to it, using await.

This is the equivalent to:

...that we used to make our requests with the TestClient.

Note that we're using async/await with the new AsyncClient - the request is asynchronous.

If your application relies on lifespan events, the AsyncClient won't trigger these events. To ensure they are triggered, use LifespanManager from florimondmanca/asgi-lifespan.

As the testing function is now asynchronous, you can now also call (and await) other async functions apart from sending requests to your FastAPI application in your tests, exactly as you would call them anywhere else in your code.

If you encounter a RuntimeError: Task attached to a different loop when integrating asynchronous function calls in your tests (e.g. when using MongoDB's MotorClient), remember to instantiate objects that need an event loop only within async functions, e.g. an @app.on_event("startup") callback.

**Examples:**

Example 1 (unknown):
```unknown
.
├── app
│   ├── __init__.py
│   ├── main.py
│   └── test_main.py
```

Example 2 (python):
```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Tomato"}
```

Example 3 (python):
```python
import pytest
from httpx import ASGITransport, AsyncClient

from .main import app


@pytest.mark.anyio
async def test_root():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Tomato"}
```

Example 4 (unknown):
```unknown
$ pytest

---> 100%
```

---

## Behind a Proxy¶

**URL:** https://fastapi.tiangolo.com/advanced/behind-a-proxy/

**Contents:**
- Behind a Proxy¶
- Proxy Forwarded Headers¶
  - Enable Proxy Forwarded Headers¶
  - Redirects with HTTPS¶
  - How Proxy Forwarded Headers Work¶
- Proxy with a stripped path prefix¶
  - Providing the root_path¶
  - Checking the current root_path¶
  - Setting the root_path in the FastAPI app¶
  - About root_path¶

In many situations, you would use a proxy like Traefik or Nginx in front of your FastAPI app.

These proxies could handle HTTPS certificates and other things.

A proxy in front of your application would normally set some headers on the fly before sending the requests to your server to let the server know that the request was forwarded by the proxy, letting it know the original (public) URL, including the domain, that it is using HTTPS, etc.

The server program (for example Uvicorn via FastAPI CLI) is capable of interpreting these headers, and then passing that information to your application.

But for security, as the server doesn't know it is behind a trusted proxy, it won't interpret those headers.

The proxy headers are:

You can start FastAPI CLI with the CLI Option --forwarded-allow-ips and pass the IP addresses that should be trusted to read those forwarded headers.

If you set it to --forwarded-allow-ips="*" it would trust all the incoming IPs.

If your server is behind a trusted proxy and only the proxy talks to it, this would make it accept whatever is the IP of that proxy.

For example, let's say you define a path operation /items/:

If the client tries to go to /items, by default, it would be redirected to /items/.

But before setting the CLI Option --forwarded-allow-ips it could redirect to http://localhost:8000/items/.

But maybe your application is hosted at https://mysuperapp.com, and the redirection should be to https://mysuperapp.com/items/.

By setting --proxy-headers now FastAPI would be able to redirect to the right location. 😎

If you want to learn more about HTTPS, check the guide About HTTPS.

Here's a visual representation of how the proxy adds forwarded headers between the client and the application server:

The proxy intercepts the original client request and adds the special forwarded headers (X-Forwarded-*) before passing the request to the application server.

These headers preserve information about the original request that would otherwise be lost:

When FastAPI CLI is configured with --forwarded-allow-ips, it trusts these headers and uses them, for example to generate the correct URLs in redirects.

You could have a proxy that adds a path prefix to your application.

In these cases you can use root_path to configure your application.

The root_path is a mechanism provided by the ASGI specification (that FastAPI is built on, through Starlette).

The root_path is used to handle these specific cases.

And it's also used internally when mounting sub-applications.

Having a proxy with a stripped path prefix, in this case, means that you could declare a path at /app in your code, but then, you add a layer on top (the proxy) that would put your FastAPI application under a path like /api/v1.

In this case, the original path /app would actually be served at /api/v1/app.

Even though all your code is written assuming there's just /app.

And the proxy would be "stripping" the path prefix on the fly before transmitting the request to the app server (probably Uvicorn via FastAPI CLI), keeping your application convinced that it is being served at /app, so that you don't have to update all your code to include the prefix /api/v1.

Up to here, everything would work as normally.

But then, when you open the integrated docs UI (the frontend), it would expect to get the OpenAPI schema at /openapi.json, instead of /api/v1/openapi.json.

So, the frontend (that runs in the browser) would try to reach /openapi.json and wouldn't be able to get the OpenAPI schema.

Because we have a proxy with a path prefix of /api/v1 for our app, the frontend needs to fetch the OpenAPI schema at /api/v1/openapi.json.

The IP 0.0.0.0 is commonly used to mean that the program listens on all the IPs available in that machine/server.

The docs UI would also need the OpenAPI schema to declare that this API server is located at /api/v1 (behind the proxy). For example:

In this example, the "Proxy" could be something like Traefik. And the server would be something like FastAPI CLI with Uvicorn, running your FastAPI application.

To achieve this, you can use the command line option --root-path like:

If you use Hypercorn, it also has the option --root-path.

The ASGI specification defines a root_path for this use case.

And the --root-path command line option provides that root_path.

You can get the current root_path used by your application for each request, it is part of the scope dictionary (that's part of the ASGI spec).

Here we are including it in the message just for demonstration purposes.

Then, if you start Uvicorn with:

The response would be something like:

Alternatively, if you don't have a way to provide a command line option like --root-path or equivalent, you can set the root_path parameter when creating your FastAPI app:

Passing the root_path to FastAPI would be the equivalent of passing the --root-path command line option to Uvicorn or Hypercorn.

Keep in mind that the server (Uvicorn) won't use that root_path for anything else than passing it to the app.

But if you go with your browser to http://127.0.0.1:8000/app you will see the normal response:

So, it won't expect to be accessed at http://127.0.0.1:8000/api/v1/app.

Uvicorn will expect the proxy to access Uvicorn at http://127.0.0.1:8000/app, and then it would be the proxy's responsibility to add the extra /api/v1 prefix on top.

Keep in mind that a proxy with stripped path prefix is only one of the ways to configure it.

Probably in many cases the default will be that the proxy doesn't have a stripped path prefix.

In a case like that (without a stripped path prefix), the proxy would listen on something like https://myawesomeapp.com, and then if the browser goes to https://myawesomeapp.com/api/v1/app and your server (e.g. Uvicorn) listens on http://127.0.0.1:8000 the proxy (without a stripped path prefix) would access Uvicorn at the same path: http://127.0.0.1:8000/api/v1/app.

You can easily run the experiment locally with a stripped path prefix using Traefik.

Download Traefik, it's a single binary, you can extract the compressed file and run it directly from the terminal.

Then create a file traefik.toml with:

This tells Traefik to listen on port 9999 and to use another file routes.toml.

We are using port 9999 instead of the standard HTTP port 80 so that you don't have to run it with admin (sudo) privileges.

Now create that other file routes.toml:

This file configures Traefik to use the path prefix /api/v1.

And then Traefik will redirect its requests to your Uvicorn running on http://127.0.0.1:8000.

And now start your app, using the --root-path option:

Now, if you go to the URL with the port for Uvicorn: http://127.0.0.1:8000/app, you will see the normal response:

Notice that even though you are accessing it at http://127.0.0.1:8000/app it shows the root_path of /api/v1, taken from the option --root-path.

And now open the URL with the port for Traefik, including the path prefix: http://127.0.0.1:9999/api/v1/app.

We get the same response:

but this time at the URL with the prefix path provided by the proxy: /api/v1.

Of course, the idea here is that everyone would access the app through the proxy, so the version with the path prefix /api/v1 is the "correct" one.

And the version without the path prefix (http://127.0.0.1:8000/app), provided by Uvicorn directly, would be exclusively for the proxy (Traefik) to access it.

That demonstrates how the Proxy (Traefik) uses the path prefix and how the server (Uvicorn) uses the root_path from the option --root-path.

But here's the fun part. ✨

The "official" way to access the app would be through the proxy with the path prefix that we defined. So, as we would expect, if you try the docs UI served by Uvicorn directly, without the path prefix in the URL, it won't work, because it expects to be accessed through the proxy.

You can check it at http://127.0.0.1:8000/docs:

But if we access the docs UI at the "official" URL using the proxy with port 9999, at /api/v1/docs, it works correctly! 🎉

You can check it at http://127.0.0.1:9999/api/v1/docs:

Right as we wanted it. ✔️

This is because FastAPI uses this root_path to create the default server in OpenAPI with the URL provided by root_path.

This is a more advanced use case. Feel free to skip it.

By default, FastAPI will create a server in the OpenAPI schema with the URL for the root_path.

But you can also provide other alternative servers, for example if you want the same docs UI to interact with both a staging and a production environment.

If you pass a custom list of servers and there's a root_path (because your API lives behind a proxy), FastAPI will insert a "server" with this root_path at the beginning of the list.

Will generate an OpenAPI schema like:

Notice the auto-generated server with a url value of /api/v1, taken from the root_path.

In the docs UI at http://127.0.0.1:9999/api/v1/docs it would look like:

The docs UI will interact with the server that you select.

If you don't want FastAPI to include an automatic server using the root_path, you can use the parameter root_path_in_servers=False:

and then it won't include it in the OpenAPI schema.

If you need to mount a sub-application (as described in Sub Applications - Mounts) while also using a proxy with root_path, you can do it normally, as you would expect.

FastAPI will internally use the root_path smartly, so it will just work. ✨

**Examples:**

Example 1 (unknown):
```unknown
$ fastapi run --forwarded-allow-ips="*"

<span style="color: green;">INFO</span>:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

Example 2 (python):
```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/items/")
def read_items():
    return ["plumbus", "portal gun"]
```

Example 3 (unknown):
```unknown
https://mysuperapp.com/items/
```

Example 4 (unknown):
```unknown
sequenceDiagram
    participant Client
    participant Proxy as Proxy/Load Balancer
    participant Server as FastAPI Server

    Client->>Proxy: HTTPS Request<br/>Host: mysuperapp.com<br/>Path: /items

    Note over Proxy: Proxy adds forwarded headers

    Proxy->>Server: HTTP Request<br/>X-Forwarded-For: [client IP]<br/>X-Forwarded-Proto: https<br/>X-Forwarded-Host: mysuperapp.com<br/>Path: /items

    Note over Server: Server interprets headers<br/>(if --forwarded-allow-ips is set)

    Server->>Proxy: HTTP Response<br/>with correct HTTPS URLs

    Proxy->>Client: HTTPS Response
```

---

## Custom Response - HTML, Stream, File, others¶

**URL:** https://fastapi.tiangolo.com/advanced/custom-response/

**Contents:**
- Custom Response - HTML, Stream, File, others¶
- Use ORJSONResponse¶
- HTML Response¶
  - Return a Response¶
  - Document in OpenAPI and override Response¶
    - Return an HTMLResponse directly¶
- Available responses¶
  - Response¶
  - HTMLResponse¶
  - PlainTextResponse¶

By default, FastAPI will return the responses using JSONResponse.

You can override it by returning a Response directly as seen in Return a Response directly.

But if you return a Response directly (or any subclass, like JSONResponse), the data won't be automatically converted (even if you declare a response_model), and the documentation won't be automatically generated (for example, including the specific "media type", in the HTTP header Content-Type as part of the generated OpenAPI).

But you can also declare the Response that you want to be used (e.g. any Response subclass), in the path operation decorator using the response_class parameter.

The contents that you return from your path operation function will be put inside of that Response.

And if that Response has a JSON media type (application/json), like is the case with the JSONResponse and UJSONResponse, the data you return will be automatically converted (and filtered) with any Pydantic response_model that you declared in the path operation decorator.

If you use a response class with no media type, FastAPI will expect your response to have no content, so it will not document the response format in its generated OpenAPI docs.

For example, if you are squeezing performance, you can install and use orjson and set the response to be ORJSONResponse.

Import the Response class (sub-class) you want to use and declare it in the path operation decorator.

For large responses, returning a Response directly is much faster than returning a dictionary.

This is because by default, FastAPI will inspect every item inside and make sure it is serializable as JSON, using the same JSON Compatible Encoder explained in the tutorial. This is what allows you to return arbitrary objects, for example database models.

But if you are certain that the content that you are returning is serializable with JSON, you can pass it directly to the response class and avoid the extra overhead that FastAPI would have by passing your return content through the jsonable_encoder before passing it to the response class.

The parameter response_class will also be used to define the "media type" of the response.

In this case, the HTTP header Content-Type will be set to application/json.

And it will be documented as such in OpenAPI.

The ORJSONResponse is only available in FastAPI, not in Starlette.

To return a response with HTML directly from FastAPI, use HTMLResponse.

The parameter response_class will also be used to define the "media type" of the response.

In this case, the HTTP header Content-Type will be set to text/html.

And it will be documented as such in OpenAPI.

As seen in Return a Response directly, you can also override the response directly in your path operation, by returning it.

The same example from above, returning an HTMLResponse, could look like:

A Response returned directly by your path operation function won't be documented in OpenAPI (for example, the Content-Type won't be documented) and won't be visible in the automatic interactive docs.

Of course, the actual Content-Type header, status code, etc, will come from the Response object you returned.

If you want to override the response from inside of the function but at the same time document the "media type" in OpenAPI, you can use the response_class parameter AND return a Response object.

The response_class will then be used only to document the OpenAPI path operation, but your Response will be used as is.

For example, it could be something like:

In this example, the function generate_html_response() already generates and returns a Response instead of returning the HTML in a str.

By returning the result of calling generate_html_response(), you are already returning a Response that will override the default FastAPI behavior.

But as you passed the HTMLResponse in the response_class too, FastAPI will know how to document it in OpenAPI and the interactive docs as HTML with text/html:

Here are some of the available responses.

Keep in mind that you can use Response to return anything else, or even create a custom sub-class.

You could also use from starlette.responses import HTMLResponse.

FastAPI provides the same starlette.responses as fastapi.responses just as a convenience for you, the developer. But most of the available responses come directly from Starlette.

The main Response class, all the other responses inherit from it.

You can return it directly.

It accepts the following parameters:

FastAPI (actually Starlette) will automatically include a Content-Length header. It will also include a Content-Type header, based on the media_type and appending a charset for text types.

Takes some text or bytes and returns an HTML response, as you read above.

Takes some text or bytes and returns a plain text response.

Takes some data and returns an application/json encoded response.

This is the default response used in FastAPI, as you read above.

A fast alternative JSON response using orjson, as you read above.

This requires installing orjson for example with pip install orjson.

An alternative JSON response using ujson.

This requires installing ujson for example with pip install ujson.

ujson is less careful than Python's built-in implementation in how it handles some edge-cases.

It's possible that ORJSONResponse might be a faster alternative.

Returns an HTTP redirect. Uses a 307 status code (Temporary Redirect) by default.

You can return a RedirectResponse directly:

Or you can use it in the response_class parameter:

If you do that, then you can return the URL directly from your path operation function.

In this case, the status_code used will be the default one for the RedirectResponse, which is 307.

You can also use the status_code parameter combined with the response_class parameter:

Takes an async generator or a normal generator/iterator and streams the response body.

If you have a file-like object (e.g. the object returned by open()), you can create a generator function to iterate over that file-like object.

That way, you don't have to read it all first in memory, and you can pass that generator function to the StreamingResponse, and return it.

This includes many libraries to interact with cloud storage, video processing, and others.

This yield from tells the function to iterate over that thing named file_like. And then, for each part iterated, yield that part as coming from this generator function (iterfile).

So, it is a generator function that transfers the "generating" work to something else internally.

By doing it this way, we can put it in a with block, and that way, ensure that the file-like object is closed after finishing.

Notice that here as we are using standard open() that doesn't support async and await, we declare the path operation with normal def.

Asynchronously streams a file as the response.

Takes a different set of arguments to instantiate than the other response types:

File responses will include appropriate Content-Length, Last-Modified and ETag headers.

You can also use the response_class parameter:

In this case, you can return the file path directly from your path operation function.

You can create your own custom response class, inheriting from Response and using it.

For example, let's say that you want to use orjson, but with some custom settings not used in the included ORJSONResponse class.

Let's say you want it to return indented and formatted JSON, so you want to use the orjson option orjson.OPT_INDENT_2.

You could create a CustomORJSONResponse. The main thing you have to do is create a Response.render(content) method that returns the content as bytes:

Now instead of returning:

...this response will return:

Of course, you will probably find much better ways to take advantage of this than formatting JSON. 😉

When creating a FastAPI class instance or an APIRouter you can specify which response class to use by default.

The parameter that defines this is default_response_class.

In the example below, FastAPI will use ORJSONResponse by default, in all path operations, instead of JSONResponse.

You can still override response_class in path operations as before.

You can also declare the media type and many other details in OpenAPI using responses: Additional Responses in OpenAPI.

**Examples:**

Example 1 (python):
```python
from fastapi import FastAPI
from fastapi.responses import ORJSONResponse

app = FastAPI()


@app.get("/items/", response_class=ORJSONResponse)
async def read_items():
    return ORJSONResponse([{"item_id": "Foo"}])
```

Example 2 (python):
```python
from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI()


@app.get("/items/", response_class=HTMLResponse)
async def read_items():
    return """
    <html>
        <head>
            <title>Some HTML in here</title>
        </head>
        <body>
            <h1>Look ma! HTML!</h1>
        </body>
    </html>
    """
```

Example 3 (python):
```python
from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI()


@app.get("/items/")
async def read_items():
    html_content = """
    <html>
        <head>
            <title>Some HTML in here</title>
        </head>
        <body>
            <h1>Look ma! HTML!</h1>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)
```

Example 4 (python):
```python
from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI()


def generate_html_response():
    html_content = """
    <html>
        <head>
            <title>Some HTML in here</title>
        </head>
        <body>
            <h1>Look ma! HTML!</h1>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)


@app.get("/items/", response_class=HTMLResponse)
async def read_items():
    return generate_html_response()
```

---

## Generating SDKs¶

**URL:** https://fastapi.tiangolo.com/advanced/generate-clients/

**Contents:**
- Generating SDKs¶
- Open Source SDK Generators¶
- SDK Generators from FastAPI Sponsors¶
- Create a TypeScript SDK¶
  - API Docs¶
  - Hey API¶
  - Using the SDK¶
- FastAPI App with Tags¶
  - Generate a TypeScript Client with Tags¶
  - Client Method Names¶

Because FastAPI is based on the OpenAPI specification, its APIs can be described in a standard format that many tools understand.

This makes it easy to generate up-to-date documentation, client libraries (SDKs) in multiple languages, and testing or automation workflows that stay in sync with your code.

In this guide, you'll learn how to generate a TypeScript SDK for your FastAPI backend.

A versatile option is the OpenAPI Generator, which supports many programming languages and can generate SDKs from your OpenAPI specification.

For TypeScript clients, Hey API is a purpose-built solution, providing an optimized experience for the TypeScript ecosystem.

You can discover more SDK generators on OpenAPI.Tools.

FastAPI automatically generates OpenAPI 3.1 specifications, so any tool you use must support this version.

This section highlights venture-backed and company-supported solutions from companies that sponsor FastAPI. These products provide additional features and integrations on top of high-quality generated SDKs.

By ✨ sponsoring FastAPI ✨, these companies help ensure the framework and its ecosystem remain healthy and sustainable.

Their sponsorship also demonstrates a strong commitment to the FastAPI community (you), showing that they care not only about offering a great service but also about supporting a robust and thriving framework, FastAPI. 🙇

For example, you might want to try:

Some of these solutions may also be open source or offer free tiers, so you can try them without a financial commitment. Other commercial SDK generators are available and can be found online. 🤓

Let's start with a simple FastAPI application:

Notice that the path operations define the models they use for request payload and response payload, using the models Item and ResponseMessage.

If you go to /docs, you will see that it has the schemas for the data to be sent in requests and received in responses:

You can see those schemas because they were declared with the models in the app.

That information is available in the app's OpenAPI schema, and then shown in the API docs.

That same information from the models that is included in OpenAPI is what can be used to generate the client code.

Once we have a FastAPI app with the models, we can use Hey API to generate a TypeScript client. The fastest way to do that is via npx.

This will generate a TypeScript SDK in ./src/client.

You can learn how to install @hey-api/openapi-ts and read about the generated output on their website.

Now you can import and use the client code. It could look like this, notice that you get autocompletion for the methods:

You will also get autocompletion for the payload to send:

Notice the autocompletion for name and price, that was defined in the FastAPI application, in the Item model.

You will have inline errors for the data that you send:

The response object will also have autocompletion:

In many cases, your FastAPI app will be bigger, and you will probably use tags to separate different groups of path operations.

For example, you could have a section for items and another section for users, and they could be separated by tags:

If you generate a client for a FastAPI app using tags, it will normally also separate the client code based on the tags.

This way, you will be able to have things ordered and grouped correctly for the client code:

In this case, you have:

Right now, the generated method names like createItemItemsPost don't look very clean:

...that's because the client generator uses the OpenAPI internal operation ID for each path operation.

OpenAPI requires that each operation ID is unique across all the path operations, so FastAPI uses the function name, the path, and the HTTP method/operation to generate that operation ID, because that way it can make sure that the operation IDs are unique.

But I'll show you how to improve that next. 🤓

You can modify the way these operation IDs are generated to make them simpler and have simpler method names in the clients.

In this case, you will have to ensure that each operation ID is unique in some other way.

For example, you could make sure that each path operation has a tag, and then generate the operation ID based on the tag and the path operation name (the function name).

FastAPI uses a unique ID for each path operation, which is used for the operation ID and also for the names of any needed custom models, for requests or responses.

You can customize that function. It takes an APIRoute and outputs a string.

For example, here it is using the first tag (you will probably have only one tag) and the path operation name (the function name).

You can then pass that custom function to FastAPI as the generate_unique_id_function parameter:

Now, if you generate the client again, you will see that it has the improved method names:

As you see, the method names now have the tag and then the function name, now they don't include information from the URL path and the HTTP operation.

The generated code still has some duplicated information.

We already know that this method is related to the items because that word is in the ItemsService (taken from the tag), but we still have the tag name prefixed in the method name too. 😕

We will probably still want to keep it for OpenAPI in general, as that will ensure that the operation IDs are unique.

But for the generated client, we could modify the OpenAPI operation IDs right before generating the clients, just to make those method names nicer and cleaner.

We could download the OpenAPI JSON to a file openapi.json and then we could remove that prefixed tag with a script like this:

With that, the operation IDs would be renamed from things like items-get_items to just get_items, that way the client generator can generate simpler method names.

Since the end result is now in an openapi.json file, you need to update your input location:

After generating the new client, you would now have clean method names, with all the autocompletion, inline errors, etc:

When using the automatically generated clients, you would get autocompletion for:

You would also have inline errors for everything.

And whenever you update the backend code, and regenerate the frontend, it would have any new path operations available as methods, the old ones removed, and any other change would be reflected on the generated code. 🤓

This also means that if something changed, it will be reflected on the client code automatically. And if you build the client, it will error out if you have any mismatch in the data used.

So, you would detect many errors very early in the development cycle instead of having to wait for the errors to show up to your final users in production and then trying to debug where the problem is. ✨

**Examples:**

Example 1 (python):
```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class Item(BaseModel):
    name: str
    price: float


class ResponseMessage(BaseModel):
    message: str


@app.post("/items/", response_model=ResponseMessage)
async def create_item(item: Item):
    return {"message": "item received"}


@app.get("/items/", response_model=list[Item])
async def get_items():
    return [
        {"name": "Plumbus", "price": 3},
        {"name": "Portal Gun", "price": 9001},
    ]
```

Example 2 (python):
```python
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class Item(BaseModel):
    name: str
    price: float


class ResponseMessage(BaseModel):
    message: str


@app.post("/items/", response_model=ResponseMessage)
async def create_item(item: Item):
    return {"message": "item received"}


@app.get("/items/", response_model=List[Item])
async def get_items():
    return [
        {"name": "Plumbus", "price": 3},
        {"name": "Portal Gun", "price": 9001},
    ]
```

Example 3 (unknown):
```unknown
npx @hey-api/openapi-ts -i http://localhost:8000/openapi.json -o src/client
```

Example 4 (python):
```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class Item(BaseModel):
    name: str
    price: float


class ResponseMessage(BaseModel):
    message: str


class User(BaseModel):
    username: str
    email: str


@app.post("/items/", response_model=ResponseMessage, tags=["items"])
async def create_item(item: Item):
    return {"message": "Item received"}


@app.get("/items/", response_model=list[Item], tags=["items"])
async def get_items():
    return [
        {"name": "Plumbus", "price": 3},
        {"name": "Portal Gun", "price": 9001},
    ]


@app.post("/users/", response_model=ResponseMessage, tags=["users"])
async def create_user(user: User):
    return {"message": "User received"}
```

---

## Lifespan Events¶

**URL:** https://fastapi.tiangolo.com/advanced/events/

**Contents:**
- Lifespan Events¶
- Use Case¶
- Lifespan¶
  - Lifespan function¶
  - Async Context Manager¶
- Alternative Events (deprecated)¶
  - startup event¶
  - shutdown event¶
  - startup and shutdown together¶
- Technical Details¶

You can define logic (code) that should be executed before the application starts up. This means that this code will be executed once, before the application starts receiving requests.

The same way, you can define logic (code) that should be executed when the application is shutting down. In this case, this code will be executed once, after having handled possibly many requests.

Because this code is executed before the application starts taking requests, and right after it finishes handling requests, it covers the whole application lifespan (the word "lifespan" will be important in a second 😉).

This can be very useful for setting up resources that you need to use for the whole app, and that are shared among requests, and/or that you need to clean up afterwards. For example, a database connection pool, or loading a shared machine learning model.

Let's start with an example use case and then see how to solve it with this.

Let's imagine that you have some machine learning models that you want to use to handle requests. 🤖

The same models are shared among requests, so, it's not one model per request, or one per user or something similar.

Let's imagine that loading the model can take quite some time, because it has to read a lot of data from disk. So you don't want to do it for every request.

You could load it at the top level of the module/file, but that would also mean that it would load the model even if you are just running a simple automated test, then that test would be slow because it would have to wait for the model to load before being able to run an independent part of the code.

That's what we'll solve, let's load the model before the requests are handled, but only right before the application starts receiving requests, not while the code is being loaded.

You can define this startup and shutdown logic using the lifespan parameter of the FastAPI app, and a "context manager" (I'll show you what that is in a second).

Let's start with an example and then see it in detail.

We create an async function lifespan() with yield like this:

Here we are simulating the expensive startup operation of loading the model by putting the (fake) model function in the dictionary with machine learning models before the yield. This code will be executed before the application starts taking requests, during the startup.

And then, right after the yield, we unload the model. This code will be executed after the application finishes handling requests, right before the shutdown. This could, for example, release resources like memory or a GPU.

The shutdown would happen when you are stopping the application.

Maybe you need to start a new version, or you just got tired of running it. 🤷

The first thing to notice, is that we are defining an async function with yield. This is very similar to Dependencies with yield.

The first part of the function, before the yield, will be executed before the application starts.

And the part after the yield will be executed after the application has finished.

If you check, the function is decorated with an @asynccontextmanager.

That converts the function into something called an "async context manager".

A context manager in Python is something that you can use in a with statement, for example, open() can be used as a context manager:

In recent versions of Python, there's also an async context manager. You would use it with async with:

When you create a context manager or an async context manager like above, what it does is that, before entering the with block, it will execute the code before the yield, and after exiting the with block, it will execute the code after the yield.

In our code example above, we don't use it directly, but we pass it to FastAPI for it to use it.

The lifespan parameter of the FastAPI app takes an async context manager, so we can pass our new lifespan async context manager to it.

The recommended way to handle the startup and shutdown is using the lifespan parameter of the FastAPI app as described above. If you provide a lifespan parameter, startup and shutdown event handlers will no longer be called. It's all lifespan or all events, not both.

You can probably skip this part.

There's an alternative way to define this logic to be executed during startup and during shutdown.

You can define event handlers (functions) that need to be executed before the application starts up, or when the application is shutting down.

These functions can be declared with async def or normal def.

To add a function that should be run before the application starts, declare it with the event "startup":

In this case, the startup event handler function will initialize the items "database" (just a dict) with some values.

You can add more than one event handler function.

And your application won't start receiving requests until all the startup event handlers have completed.

To add a function that should be run when the application is shutting down, declare it with the event "shutdown":

Here, the shutdown event handler function will write a text line "Application shutdown" to a file log.txt.

In the open() function, the mode="a" means "append", so, the line will be added after whatever is on that file, without overwriting the previous contents.

Notice that in this case we are using a standard Python open() function that interacts with a file.

So, it involves I/O (input/output), that requires "waiting" for things to be written to disk.

But open() doesn't use async and await.

So, we declare the event handler function with standard def instead of async def.

There's a high chance that the logic for your startup and shutdown is connected, you might want to start something and then finish it, acquire a resource and then release it, etc.

Doing that in separated functions that don't share logic or variables together is more difficult as you would need to store values in global variables or similar tricks.

Because of that, it's now recommended to instead use the lifespan as explained above.

Just a technical detail for the curious nerds. 🤓

Underneath, in the ASGI technical specification, this is part of the Lifespan Protocol, and it defines events called startup and shutdown.

You can read more about the Starlette lifespan handlers in Starlette's Lifespan' docs.

Including how to handle lifespan state that can be used in other areas of your code.

🚨 Keep in mind that these lifespan events (startup and shutdown) will only be executed for the main application, not for Sub Applications - Mounts.

**Examples:**

Example 1 (python):
```python
from contextlib import asynccontextmanager

from fastapi import FastAPI


def fake_answer_to_everything_ml_model(x: float):
    return x * 42


ml_models = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the ML model
    ml_models["answer_to_everything"] = fake_answer_to_everything_ml_model
    yield
    # Clean up the ML models and release the resources
    ml_models.clear()


app = FastAPI(lifespan=lifespan)


@app.get("/predict")
async def predict(x: float):
    result = ml_models["answer_to_everything"](x)
    return {"result": result}
```

Example 2 (python):
```python
from contextlib import asynccontextmanager

from fastapi import FastAPI


def fake_answer_to_everything_ml_model(x: float):
    return x * 42


ml_models = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the ML model
    ml_models["answer_to_everything"] = fake_answer_to_everything_ml_model
    yield
    # Clean up the ML models and release the resources
    ml_models.clear()


app = FastAPI(lifespan=lifespan)


@app.get("/predict")
async def predict(x: float):
    result = ml_models["answer_to_everything"](x)
    return {"result": result}
```

Example 3 (python):
```python
from contextlib import asynccontextmanager

from fastapi import FastAPI


def fake_answer_to_everything_ml_model(x: float):
    return x * 42


ml_models = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the ML model
    ml_models["answer_to_everything"] = fake_answer_to_everything_ml_model
    yield
    # Clean up the ML models and release the resources
    ml_models.clear()


app = FastAPI(lifespan=lifespan)


@app.get("/predict")
async def predict(x: float):
    result = ml_models["answer_to_everything"](x)
    return {"result": result}
```

Example 4 (unknown):
```unknown
with open("file.txt") as file:
    file.read()
```

---

## OAuth2 scopes¶

**URL:** https://fastapi.tiangolo.com/advanced/security/oauth2-scopes/

**Contents:**
- OAuth2 scopes¶
- OAuth2 scopes and OpenAPI¶
- Global view¶
- OAuth2 Security scheme¶
- JWT token with scopes¶
- Declare scopes in path operations and dependencies¶
- Use SecurityScopes¶
- Use the scopes¶
- Verify the username and data shape¶
- Verify the scopes¶

You can use OAuth2 scopes directly with FastAPI, they are integrated to work seamlessly.

This would allow you to have a more fine-grained permission system, following the OAuth2 standard, integrated into your OpenAPI application (and the API docs).

OAuth2 with scopes is the mechanism used by many big authentication providers, like Facebook, Google, GitHub, Microsoft, X (Twitter), etc. They use it to provide specific permissions to users and applications.

Every time you "log in with" Facebook, Google, GitHub, Microsoft, X (Twitter), that application is using OAuth2 with scopes.

In this section you will see how to manage authentication and authorization with the same OAuth2 with scopes in your FastAPI application.

This is a more or less advanced section. If you are just starting, you can skip it.

You don't necessarily need OAuth2 scopes, and you can handle authentication and authorization however you want.

But OAuth2 with scopes can be nicely integrated into your API (with OpenAPI) and your API docs.

Nevertheless, you still enforce those scopes, or any other security/authorization requirement, however you need, in your code.

In many cases, OAuth2 with scopes can be an overkill.

But if you know you need it, or you are curious, keep reading.

The OAuth2 specification defines "scopes" as a list of strings separated by spaces.

The content of each of these strings can have any format, but should not contain spaces.

These scopes represent "permissions".

In OpenAPI (e.g. the API docs), you can define "security schemes".

When one of these security schemes uses OAuth2, you can also declare and use scopes.

Each "scope" is just a string (without spaces).

They are normally used to declare specific security permissions, for example:

In OAuth2 a "scope" is just a string that declares a specific permission required.

It doesn't matter if it has other characters like : or if it is a URL.

Those details are implementation specific.

For OAuth2 they are just strings.

First, let's quickly see the parts that change from the examples in the main Tutorial - User Guide for OAuth2 with Password (and hashing), Bearer with JWT tokens. Now using OAuth2 scopes:

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

Now let's review those changes step by step.

The first change is that now we are declaring the OAuth2 security scheme with two available scopes, me and items.

The scopes parameter receives a dict with each scope as a key and the description as the value:

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

Because we are now declaring those scopes, they will show up in the API docs when you log-in/authorize.

And you will be able to select which scopes you want to give access to: me and items.

This is the same mechanism used when you give permissions while logging in with Facebook, Google, GitHub, etc:

Now, modify the token path operation to return the scopes requested.

We are still using the same OAuth2PasswordRequestForm. It includes a property scopes with a list of str, with each scope it received in the request.

And we return the scopes as part of the JWT token.

For simplicity, here we are just adding the scopes received directly to the token.

But in your application, for security, you should make sure you only add the scopes that the user is actually able to have, or the ones you have predefined.

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

Now we declare that the path operation for /users/me/items/ requires the scope items.

For this, we import and use Security from fastapi.

You can use Security to declare dependencies (just like Depends), but Security also receives a parameter scopes with a list of scopes (strings).

In this case, we pass a dependency function get_current_active_user to Security (the same way we would do with Depends).

But we also pass a list of scopes, in this case with just one scope: items (it could have more).

And the dependency function get_current_active_user can also declare sub-dependencies, not only with Depends but also with Security. Declaring its own sub-dependency function (get_current_user), and more scope requirements.

In this case, it requires the scope me (it could require more than one scope).

You don't necessarily need to add different scopes in different places.

We are doing it here to demonstrate how FastAPI handles scopes declared at different levels.

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

Security is actually a subclass of Depends, and it has just one extra parameter that we'll see later.

But by using Security instead of Depends, FastAPI will know that it can declare security scopes, use them internally, and document the API with OpenAPI.

But when you import Query, Path, Depends, Security and others from fastapi, those are actually functions that return special classes.

Now update the dependency get_current_user.

This is the one used by the dependencies above.

Here's where we are using the same OAuth2 scheme we created before, declaring it as a dependency: oauth2_scheme.

Because this dependency function doesn't have any scope requirements itself, we can use Depends with oauth2_scheme, we don't have to use Security when we don't need to specify security scopes.

We also declare a special parameter of type SecurityScopes, imported from fastapi.security.

This SecurityScopes class is similar to Request (Request was used to get the request object directly).

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

The parameter security_scopes will be of type SecurityScopes.

It will have a property scopes with a list containing all the scopes required by itself and all the dependencies that use this as a sub-dependency. That means, all the "dependants"... this might sound confusing, it is explained again later below.

The security_scopes object (of class SecurityScopes) also provides a scope_str attribute with a single string, containing those scopes separated by spaces (we are going to use it).

We create an HTTPException that we can reuse (raise) later at several points.

In this exception, we include the scopes required (if any) as a string separated by spaces (using scope_str). We put that string containing the scopes in the WWW-Authenticate header (this is part of the spec).

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

We verify that we get a username, and extract the scopes.

And then we validate that data with the Pydantic model (catching the ValidationError exception), and if we get an error reading the JWT token or validating the data with Pydantic, we raise the HTTPException we created before.

For that, we update the Pydantic model TokenData with a new property scopes.

By validating the data with Pydantic we can make sure that we have, for example, exactly a list of str with the scopes and a str with the username.

Instead of, for example, a dict, or something else, as it could break the application at some point later, making it a security risk.

We also verify that we have a user with that username, and if not, we raise that same exception we created before.

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

We now verify that all the scopes required, by this dependency and all the dependants (including path operations), are included in the scopes provided in the token received, otherwise raise an HTTPException.

For this, we use security_scopes.scopes, that contains a list with all these scopes as str.

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

Let's review again this dependency tree and the scopes.

As the get_current_active_user dependency has as a sub-dependency on get_current_user, the scope "me" declared at get_current_active_user will be included in the list of required scopes in the security_scopes.scopes passed to get_current_user.

The path operation itself also declares a scope, "items", so this will also be in the list of security_scopes.scopes passed to get_current_user.

Here's how the hierarchy of dependencies and scopes looks like:

The important and "magic" thing here is that get_current_user will have a different list of scopes to check for each path operation.

All depending on the scopes declared in each path operation and each dependency in the dependency tree for that specific path operation.

You can use SecurityScopes at any point, and in multiple places, it doesn't have to be at the "root" dependency.

It will always have the security scopes declared in the current Security dependencies and all the dependants for that specific path operation and that specific dependency tree.

Because the SecurityScopes will have all the scopes declared by dependants, you can use it to verify that a token has the required scopes in a central dependency function, and then declare different scope requirements in different path operations.

They will be checked independently for each path operation.

If you open the API docs, you can authenticate and specify which scopes you want to authorize.

If you don't select any scope, you will be "authenticated", but when you try to access /users/me/ or /users/me/items/ you will get an error saying that you don't have enough permissions. You will still be able to access /status/.

And if you select the scope me but not the scope items, you will be able to access /users/me/ but not /users/me/items/.

That's what would happen to a third party application that tried to access one of these path operations with a token provided by a user, depending on how many permissions the user gave the application.

In this example we are using the OAuth2 "password" flow.

This is appropriate when we are logging in to our own application, probably with our own frontend.

Because we can trust it to receive the username and password, as we control it.

But if you are building an OAuth2 application that others would connect to (i.e., if you are building an authentication provider equivalent to Facebook, Google, GitHub, etc.) you should use one of the other flows.

The most common is the implicit flow.

The most secure is the code flow, but it's more complex to implement as it requires more steps. As it is more complex, many providers end up suggesting the implicit flow.

It's common that each authentication provider names their flows in a different way, to make it part of their brand.

But in the end, they are implementing the same OAuth2 standard.

FastAPI includes utilities for all these OAuth2 authentication flows in fastapi.security.oauth2.

The same way you can define a list of Depends in the decorator's dependencies parameter (as explained in Dependencies in path operation decorators), you could also use Security with scopes there.

**Examples:**

Example 1 (python):
```python
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, FastAPI, HTTPException, Security, status
from fastapi.security import (
    OAuth2PasswordBearer,
    OAuth2PasswordRequestForm,
    SecurityScopes,
)
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from pydantic import BaseModel, ValidationError

# to get a string like this run:
# openssl rand -hex 32
SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


fake_users_db = {
    "johndoe": {
        "username": "johndoe",
        "full_name": "John Doe",
        "email": "johndoe@example.com",
        "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$wagCPXjifgvUFBzq4hqe3w$CYaIb8sB+wtD+Vu/P4uod1+Qof8h+1g7bbDlBID48Rc",
        "disabled": False,
    },
    "alice": {
        "username": "alice",
        "full_name": "Alice Chains",
        "email": "alicechains@example.com",
        "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$g2/AV1zwopqUntPKJavBFw$BwpRGDCyUHLvHICnwijyX8ROGoiUPwNKZ7915MeYfCE",
        "disabled": True,
    },
}


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None
    scopes: list[str] = []


class User(BaseModel):
    username: str
    email: str | None = None
    full_name: str | None = None
    disabled: bool | None = None


class UserInDB(User):
    hashed_password: str


password_hash = PasswordHash.recommended()

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="token",
    scopes={"me": "Read information about the current user.", "items": "Read items."},
)

app = FastAPI()


def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)


def get_password_hash(password):
    return password_hash.hash(password)


def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)


def authenticate_user(fake_db, username: str, password: str):
    user = get_user(fake_db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    security_scopes: SecurityScopes, token: Annotated[str, Depends(oauth2_scheme)]
):
    if security_scopes.scopes:
        authenticate_value = f'Bearer scope="{security_scopes.scope_str}"'
    else:
        authenticate_value = "Bearer"
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": authenticate_value},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
        scope: str = payload.get("scope", "")
        token_scopes = scope.split(" ")
        token_data = TokenData(scopes=token_scopes, username=username)
    except (InvalidTokenError, ValidationError):
        raise credentials_exception
    user = get_user(fake_users_db, username=token_data.username)
    if user is None:
        raise credentials_exception
    for scope in security_scopes.scopes:
        if scope not in token_data.scopes:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not enough permissions",
                headers={"WWW-Authenticate": authenticate_value},
            )
    return user


async def get_current_active_user(
    current_user: Annotated[User, Security(get_current_user, scopes=["me"])],
):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


@app.post("/token")
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "scope": " ".join(form_data.scopes)},
        expires_delta=access_token_expires,
    )
    return Token(access_token=access_token, token_type="bearer")


@app.get("/users/me/", response_model=User)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return current_user


@app.get("/users/me/items/")
async def read_own_items(
    current_user: Annotated[User, Security(get_current_active_user, scopes=["items"])],
):
    return [{"item_id": "Foo", "owner": current_user.username}]


@app.get("/status/")
async def read_system_status(current_user: Annotated[User, Depends(get_current_user)]):
    return {"status": "ok"}
```

Example 2 (python):
```python
from datetime import datetime, timedelta, timezone
from typing import Annotated, Union

import jwt
from fastapi import Depends, FastAPI, HTTPException, Security, status
from fastapi.security import (
    OAuth2PasswordBearer,
    OAuth2PasswordRequestForm,
    SecurityScopes,
)
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from pydantic import BaseModel, ValidationError

# to get a string like this run:
# openssl rand -hex 32
SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


fake_users_db = {
    "johndoe": {
        "username": "johndoe",
        "full_name": "John Doe",
        "email": "johndoe@example.com",
        "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$wagCPXjifgvUFBzq4hqe3w$CYaIb8sB+wtD+Vu/P4uod1+Qof8h+1g7bbDlBID48Rc",
        "disabled": False,
    },
    "alice": {
        "username": "alice",
        "full_name": "Alice Chains",
        "email": "alicechains@example.com",
        "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$g2/AV1zwopqUntPKJavBFw$BwpRGDCyUHLvHICnwijyX8ROGoiUPwNKZ7915MeYfCE",
        "disabled": True,
    },
}


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Union[str, None] = None
    scopes: list[str] = []


class User(BaseModel):
    username: str
    email: Union[str, None] = None
    full_name: Union[str, None] = None
    disabled: Union[bool, None] = None


class UserInDB(User):
    hashed_password: str


password_hash = PasswordHash.recommended()

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="token",
    scopes={"me": "Read information about the current user.", "items": "Read items."},
)

app = FastAPI()


def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)


def get_password_hash(password):
    return password_hash.hash(password)


def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)


def authenticate_user(fake_db, username: str, password: str):
    user = get_user(fake_db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    security_scopes: SecurityScopes, token: Annotated[str, Depends(oauth2_scheme)]
):
    if security_scopes.scopes:
        authenticate_value = f'Bearer scope="{security_scopes.scope_str}"'
    else:
        authenticate_value = "Bearer"
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": authenticate_value},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
        scope: str = payload.get("scope", "")
        token_scopes = scope.split(" ")
        token_data = TokenData(scopes=token_scopes, username=username)
    except (InvalidTokenError, ValidationError):
        raise credentials_exception
    user = get_user(fake_users_db, username=token_data.username)
    if user is None:
        raise credentials_exception
    for scope in security_scopes.scopes:
        if scope not in token_data.scopes:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not enough permissions",
                headers={"WWW-Authenticate": authenticate_value},
            )
    return user


async def get_current_active_user(
    current_user: Annotated[User, Security(get_current_user, scopes=["me"])],
):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


@app.post("/token")
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "scope": " ".join(form_data.scopes)},
        expires_delta=access_token_expires,
    )
    return Token(access_token=access_token, token_type="bearer")


@app.get("/users/me/", response_model=User)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return current_user


@app.get("/users/me/items/")
async def read_own_items(
    current_user: Annotated[User, Security(get_current_active_user, scopes=["items"])],
):
    return [{"item_id": "Foo", "owner": current_user.username}]


@app.get("/status/")
async def read_system_status(current_user: Annotated[User, Depends(get_current_user)]):
    return {"status": "ok"}
```

Example 3 (python):
```python
from datetime import datetime, timedelta, timezone
from typing import List, Union

import jwt
from fastapi import Depends, FastAPI, HTTPException, Security, status
from fastapi.security import (
    OAuth2PasswordBearer,
    OAuth2PasswordRequestForm,
    SecurityScopes,
)
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from pydantic import BaseModel, ValidationError
from typing_extensions import Annotated

# to get a string like this run:
# openssl rand -hex 32
SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


fake_users_db = {
    "johndoe": {
        "username": "johndoe",
        "full_name": "John Doe",
        "email": "johndoe@example.com",
        "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$wagCPXjifgvUFBzq4hqe3w$CYaIb8sB+wtD+Vu/P4uod1+Qof8h+1g7bbDlBID48Rc",
        "disabled": False,
    },
    "alice": {
        "username": "alice",
        "full_name": "Alice Chains",
        "email": "alicechains@example.com",
        "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$g2/AV1zwopqUntPKJavBFw$BwpRGDCyUHLvHICnwijyX8ROGoiUPwNKZ7915MeYfCE",
        "disabled": True,
    },
}


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Union[str, None] = None
    scopes: List[str] = []


class User(BaseModel):
    username: str
    email: Union[str, None] = None
    full_name: Union[str, None] = None
    disabled: Union[bool, None] = None


class UserInDB(User):
    hashed_password: str


password_hash = PasswordHash.recommended()

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="token",
    scopes={"me": "Read information about the current user.", "items": "Read items."},
)

app = FastAPI()


def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)


def get_password_hash(password):
    return password_hash.hash(password)


def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)


def authenticate_user(fake_db, username: str, password: str):
    user = get_user(fake_db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    security_scopes: SecurityScopes, token: Annotated[str, Depends(oauth2_scheme)]
):
    if security_scopes.scopes:
        authenticate_value = f'Bearer scope="{security_scopes.scope_str}"'
    else:
        authenticate_value = "Bearer"
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": authenticate_value},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
        scope: str = payload.get("scope", "")
        token_scopes = scope.split(" ")
        token_data = TokenData(scopes=token_scopes, username=username)
    except (InvalidTokenError, ValidationError):
        raise credentials_exception
    user = get_user(fake_users_db, username=token_data.username)
    if user is None:
        raise credentials_exception
    for scope in security_scopes.scopes:
        if scope not in token_data.scopes:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not enough permissions",
                headers={"WWW-Authenticate": authenticate_value},
            )
    return user


async def get_current_active_user(
    current_user: Annotated[User, Security(get_current_user, scopes=["me"])],
):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


@app.post("/token")
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "scope": " ".join(form_data.scopes)},
        expires_delta=access_token_expires,
    )
    return Token(access_token=access_token, token_type="bearer")


@app.get("/users/me/", response_model=User)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return current_user


@app.get("/users/me/items/")
async def read_own_items(
    current_user: Annotated[User, Security(get_current_active_user, scopes=["items"])],
):
    return [{"item_id": "Foo", "owner": current_user.username}]


@app.get("/status/")
async def read_system_status(current_user: Annotated[User, Depends(get_current_user)]):
    return {"status": "ok"}
```

Example 4 (python):
```python
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, FastAPI, HTTPException, Security, status
from fastapi.security import (
    OAuth2PasswordBearer,
    OAuth2PasswordRequestForm,
    SecurityScopes,
)
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from pydantic import BaseModel, ValidationError

# to get a string like this run:
# openssl rand -hex 32
SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


fake_users_db = {
    "johndoe": {
        "username": "johndoe",
        "full_name": "John Doe",
        "email": "johndoe@example.com",
        "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$wagCPXjifgvUFBzq4hqe3w$CYaIb8sB+wtD+Vu/P4uod1+Qof8h+1g7bbDlBID48Rc",
        "disabled": False,
    },
    "alice": {
        "username": "alice",
        "full_name": "Alice Chains",
        "email": "alicechains@example.com",
        "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$g2/AV1zwopqUntPKJavBFw$BwpRGDCyUHLvHICnwijyX8ROGoiUPwNKZ7915MeYfCE",
        "disabled": True,
    },
}


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None
    scopes: list[str] = []


class User(BaseModel):
    username: str
    email: str | None = None
    full_name: str | None = None
    disabled: bool | None = None


class UserInDB(User):
    hashed_password: str


password_hash = PasswordHash.recommended()

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="token",
    scopes={"me": "Read information about the current user.", "items": "Read items."},
)

app = FastAPI()


def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)


def get_password_hash(password):
    return password_hash.hash(password)


def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)


def authenticate_user(fake_db, username: str, password: str):
    user = get_user(fake_db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    security_scopes: SecurityScopes, token: str = Depends(oauth2_scheme)
):
    if security_scopes.scopes:
        authenticate_value = f'Bearer scope="{security_scopes.scope_str}"'
    else:
        authenticate_value = "Bearer"
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": authenticate_value},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        scope: str = payload.get("scope", "")
        token_scopes = scope.split(" ")
        token_data = TokenData(scopes=token_scopes, username=username)
    except (InvalidTokenError, ValidationError):
        raise credentials_exception
    user = get_user(fake_users_db, username=token_data.username)
    if user is None:
        raise credentials_exception
    for scope in security_scopes.scopes:
        if scope not in token_data.scopes:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not enough permissions",
                headers={"WWW-Authenticate": authenticate_value},
            )
    return user


async def get_current_active_user(
    current_user: User = Security(get_current_user, scopes=["me"]),
):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


@app.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Token:
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "scope": " ".join(form_data.scopes)},
        expires_delta=access_token_expires,
    )
    return Token(access_token=access_token, token_type="bearer")


@app.get("/users/me/", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@app.get("/users/me/items/")
async def read_own_items(
    current_user: User = Security(get_current_active_user, scopes=["items"]),
):
    return [{"item_id": "Foo", "owner": current_user.username}]


@app.get("/status/")
async def read_system_status(current_user: User = Depends(get_current_user)):
    return {"status": "ok"}
```

---

## OpenAPI Callbacks¶

**URL:** https://fastapi.tiangolo.com/advanced/openapi-callbacks/

**Contents:**
- OpenAPI Callbacks¶
- An app with callbacks¶
- The normal FastAPI app¶
- Documenting the callback¶
- Write the callback documentation code¶
  - Create a callback APIRouter¶
  - Create the callback path operation¶
  - The callback path expression¶
  - Add the callback router¶
  - Check the docs¶

You could create an API with a path operation that could trigger a request to an external API created by someone else (probably the same developer that would be using your API).

The process that happens when your API app calls the external API is named a "callback". Because the software that the external developer wrote sends a request to your API and then your API calls back, sending a request to an external API (that was probably created by the same developer).

In this case, you could want to document how that external API should look like. What path operation it should have, what body it should expect, what response it should return, etc.

Let's see all this with an example.

Imagine you develop an app that allows creating invoices.

These invoices will have an id, title (optional), customer, and total.

The user of your API (an external developer) will create an invoice in your API with a POST request.

Then your API will (let's imagine):

Let's first see how the normal API app would look like before adding the callback.

It will have a path operation that will receive an Invoice body, and a query parameter callback_url that will contain the URL for the callback.

This part is pretty normal, most of the code is probably already familiar to you:

The callback_url query parameter uses a Pydantic Url type.

The only new thing is the callbacks=invoices_callback_router.routes as an argument to the path operation decorator. We'll see what that is next.

The actual callback code will depend heavily on your own API app.

And it will probably vary a lot from one app to the next.

It could be just one or two lines of code, like:

But possibly the most important part of the callback is making sure that your API user (the external developer) implements the external API correctly, according to the data that your API is going to send in the request body of the callback, etc.

So, what we will do next is add the code to document how that external API should look like to receive the callback from your API.

That documentation will show up in the Swagger UI at /docs in your API, and it will let external developers know how to build the external API.

This example doesn't implement the callback itself (that could be just a line of code), only the documentation part.

The actual callback is just an HTTP request.

When implementing the callback yourself, you could use something like HTTPX or Requests.

This code won't be executed in your app, we only need it to document how that external API should look like.

But, you already know how to easily create automatic documentation for an API with FastAPI.

So we are going to use that same knowledge to document how the external API should look like... by creating the path operation(s) that the external API should implement (the ones your API will call).

When writing the code to document a callback, it might be useful to imagine that you are that external developer. And that you are currently implementing the external API, not your API.

Temporarily adopting this point of view (of the external developer) can help you feel like it's more obvious where to put the parameters, the Pydantic model for the body, for the response, etc. for that external API.

First create a new APIRouter that will contain one or more callbacks.

To create the callback path operation use the same APIRouter you created above.

It should look just like a normal FastAPI path operation:

There are 2 main differences from a normal path operation:

The callback path can have an OpenAPI 3 expression that can contain parts of the original request sent to your API.

In this case, it's the str:

So, if your API user (the external developer) sends a request to your API to:

then your API will process the invoice, and at some point later, send a callback request to the callback_url (the external API):

with a JSON body containing something like:

and it would expect a response from that external API with a JSON body like:

Notice how the callback URL used contains the URL received as a query parameter in callback_url (https://www.external.org/events) and also the invoice id from inside of the JSON body (2expen51ve).

At this point you have the callback path operation(s) needed (the one(s) that the external developer should implement in the external API) in the callback router you created above.

Now use the parameter callbacks in your API's path operation decorator to pass the attribute .routes (that's actually just a list of routes/path operations) from that callback router:

Notice that you are not passing the router itself (invoices_callback_router) to callback=, but the attribute .routes, as in invoices_callback_router.routes.

Now you can start your app and go to http://127.0.0.1:8000/docs.

You will see your docs including a "Callbacks" section for your path operation that shows how the external API should look like:

**Examples:**

Example 1 (python):
```python
from typing import Union

from fastapi import APIRouter, FastAPI
from pydantic import BaseModel, HttpUrl

app = FastAPI()


class Invoice(BaseModel):
    id: str
    title: Union[str, None] = None
    customer: str
    total: float


class InvoiceEvent(BaseModel):
    description: str
    paid: bool


class InvoiceEventReceived(BaseModel):
    ok: bool


invoices_callback_router = APIRouter()


@invoices_callback_router.post(
    "{$callback_url}/invoices/{$request.body.id}", response_model=InvoiceEventReceived
)
def invoice_notification(body: InvoiceEvent):
    pass


@app.post("/invoices/", callbacks=invoices_callback_router.routes)
def create_invoice(invoice: Invoice, callback_url: Union[HttpUrl, None] = None):
    """
    Create an invoice.

    This will (let's imagine) let the API user (some external developer) create an
    invoice.

    And this path operation will:

    * Send the invoice to the client.
    * Collect the money from the client.
    * Send a notification back to the API user (the external developer), as a callback.
        * At this point is that the API will somehow send a POST request to the
            external API with the notification of the invoice event
            (e.g. "payment successful").
    """
    # Send the invoice, collect the money, send the notification (the callback)
    return {"msg": "Invoice received"}
```

Example 2 (unknown):
```unknown
callback_url = "https://example.com/api/v1/invoices/events/"
httpx.post(callback_url, json={"description": "Invoice paid", "paid": True})
```

Example 3 (python):
```python
from typing import Union

from fastapi import APIRouter, FastAPI
from pydantic import BaseModel, HttpUrl

app = FastAPI()


class Invoice(BaseModel):
    id: str
    title: Union[str, None] = None
    customer: str
    total: float


class InvoiceEvent(BaseModel):
    description: str
    paid: bool


class InvoiceEventReceived(BaseModel):
    ok: bool


invoices_callback_router = APIRouter()


@invoices_callback_router.post(
    "{$callback_url}/invoices/{$request.body.id}", response_model=InvoiceEventReceived
)
def invoice_notification(body: InvoiceEvent):
    pass


@app.post("/invoices/", callbacks=invoices_callback_router.routes)
def create_invoice(invoice: Invoice, callback_url: Union[HttpUrl, None] = None):
    """
    Create an invoice.

    This will (let's imagine) let the API user (some external developer) create an
    invoice.

    And this path operation will:

    * Send the invoice to the client.
    * Collect the money from the client.
    * Send a notification back to the API user (the external developer), as a callback.
        * At this point is that the API will somehow send a POST request to the
            external API with the notification of the invoice event
            (e.g. "payment successful").
    """
    # Send the invoice, collect the money, send the notification (the callback)
    return {"msg": "Invoice received"}
```

Example 4 (python):
```python
from typing import Union

from fastapi import APIRouter, FastAPI
from pydantic import BaseModel, HttpUrl

app = FastAPI()


class Invoice(BaseModel):
    id: str
    title: Union[str, None] = None
    customer: str
    total: float


class InvoiceEvent(BaseModel):
    description: str
    paid: bool


class InvoiceEventReceived(BaseModel):
    ok: bool


invoices_callback_router = APIRouter()


@invoices_callback_router.post(
    "{$callback_url}/invoices/{$request.body.id}", response_model=InvoiceEventReceived
)
def invoice_notification(body: InvoiceEvent):
    pass


@app.post("/invoices/", callbacks=invoices_callback_router.routes)
def create_invoice(invoice: Invoice, callback_url: Union[HttpUrl, None] = None):
    """
    Create an invoice.

    This will (let's imagine) let the API user (some external developer) create an
    invoice.

    And this path operation will:

    * Send the invoice to the client.
    * Collect the money from the client.
    * Send a notification back to the API user (the external developer), as a callback.
        * At this point is that the API will somehow send a POST request to the
            external API with the notification of the invoice event
            (e.g. "payment successful").
    """
    # Send the invoice, collect the money, send the notification (the callback)
    return {"msg": "Invoice received"}
```

---

## OpenAPI Webhooks¶

**URL:** https://fastapi.tiangolo.com/advanced/openapi-webhooks/

**Contents:**
- OpenAPI Webhooks¶
- Webhooks steps¶
- Documenting webhooks with FastAPI and OpenAPI¶
- An app with webhooks¶
  - Check the docs¶

There are cases where you want to tell your API users that your app could call their app (sending a request) with some data, normally to notify of some type of event.

This means that instead of the normal process of your users sending requests to your API, it's your API (or your app) that could send requests to their system (to their API, their app).

This is normally called a webhook.

The process normally is that you define in your code what is the message that you will send, the body of the request.

You also define in some way at which moments your app will send those requests or events.

And your users define in some way (for example in a web dashboard somewhere) the URL where your app should send those requests.

All the logic about how to register the URLs for webhooks and the code to actually send those requests is up to you. You write it however you want to in your own code.

With FastAPI, using OpenAPI, you can define the names of these webhooks, the types of HTTP operations that your app can send (e.g. POST, PUT, etc.) and the request bodies that your app would send.

This can make it a lot easier for your users to implement their APIs to receive your webhook requests, they might even be able to autogenerate some of their own API code.

Webhooks are available in OpenAPI 3.1.0 and above, supported by FastAPI 0.99.0 and above.

When you create a FastAPI application, there is a webhooks attribute that you can use to define webhooks, the same way you would define path operations, for example with @app.webhooks.post().

The webhooks that you define will end up in the OpenAPI schema and the automatic docs UI.

The app.webhooks object is actually just an APIRouter, the same type you would use when structuring your app with multiple files.

Notice that with webhooks you are actually not declaring a path (like /items/), the text you pass there is just an identifier of the webhook (the name of the event), for example in @app.webhooks.post("new-subscription"), the webhook name is new-subscription.

This is because it is expected that your users would define the actual URL path where they want to receive the webhook request in some other way (e.g. a web dashboard).

Now you can start your app and go to http://127.0.0.1:8000/docs.

You will see your docs have the normal path operations and now also some webhooks:

**Examples:**

Example 1 (python):
```python
from datetime import datetime

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class Subscription(BaseModel):
    username: str
    monthly_fee: float
    start_date: datetime


@app.webhooks.post("new-subscription")
def new_subscription(body: Subscription):
    """
    When a new user subscribes to your service we'll send you a POST request with this
    data to the URL that you register for the event `new-subscription` in the dashboard.
    """


@app.get("/users/")
def read_users():
    return ["Rick", "Morty"]
```

---

## Path Operation Advanced Configuration¶

**URL:** https://fastapi.tiangolo.com/advanced/path-operation-advanced-configuration/

**Contents:**
- Path Operation Advanced Configuration¶
- OpenAPI operationId¶
  - Using the path operation function name as the operationId¶
- Exclude from OpenAPI¶
- Advanced description from docstring¶
- Additional Responses¶
- OpenAPI Extra¶
  - OpenAPI Extensions¶
  - Custom OpenAPI path operation schema¶
  - Custom OpenAPI content type¶

If you are not an "expert" in OpenAPI, you probably don't need this.

You can set the OpenAPI operationId to be used in your path operation with the parameter operation_id.

You would have to make sure that it is unique for each operation.

If you want to use your APIs' function names as operationIds, you can iterate over all of them and override each path operation's operation_id using their APIRoute.name.

You should do it after adding all your path operations.

If you manually call app.openapi(), you should update the operationIds before that.

If you do this, you have to make sure each one of your path operation functions has a unique name.

Even if they are in different modules (Python files).

To exclude a path operation from the generated OpenAPI schema (and thus, from the automatic documentation systems), use the parameter include_in_schema and set it to False:

You can limit the lines used from the docstring of a path operation function for OpenAPI.

Adding an \f (an escaped "form feed" character) causes FastAPI to truncate the output used for OpenAPI at this point.

It won't show up in the documentation, but other tools (such as Sphinx) will be able to use the rest.

You probably have seen how to declare the response_model and status_code for a path operation.

That defines the metadata about the main response of a path operation.

You can also declare additional responses with their models, status codes, etc.

There's a whole chapter here in the documentation about it, you can read it at Additional Responses in OpenAPI.

When you declare a path operation in your application, FastAPI automatically generates the relevant metadata about that path operation to be included in the OpenAPI schema.

In the OpenAPI specification it is called the Operation Object.

It has all the information about the path operation and is used to generate the automatic documentation.

It includes the tags, parameters, requestBody, responses, etc.

This path operation-specific OpenAPI schema is normally generated automatically by FastAPI, but you can also extend it.

This is a low level extension point.

If you only need to declare additional responses, a more convenient way to do it is with Additional Responses in OpenAPI.

You can extend the OpenAPI schema for a path operation using the parameter openapi_extra.

This openapi_extra can be helpful, for example, to declare OpenAPI Extensions:

If you open the automatic API docs, your extension will show up at the bottom of the specific path operation.

And if you see the resulting OpenAPI (at /openapi.json in your API), you will see your extension as part of the specific path operation too:

The dictionary in openapi_extra will be deeply merged with the automatically generated OpenAPI schema for the path operation.

So, you could add additional data to the automatically generated schema.

For example, you could decide to read and validate the request with your own code, without using the automatic features of FastAPI with Pydantic, but you could still want to define the request in the OpenAPI schema.

You could do that with openapi_extra:

In this example, we didn't declare any Pydantic model. In fact, the request body is not even parsed as JSON, it is read directly as bytes, and the function magic_data_reader() would be in charge of parsing it in some way.

Nevertheless, we can declare the expected schema for the request body.

Using this same trick, you could use a Pydantic model to define the JSON Schema that is then included in the custom OpenAPI schema section for the path operation.

And you could do this even if the data type in the request is not JSON.

For example, in this application we don't use FastAPI's integrated functionality to extract the JSON Schema from Pydantic models nor the automatic validation for JSON. In fact, we are declaring the request content type as YAML, not JSON:

In Pydantic version 1 the method to get the JSON Schema for a model was called Item.schema(), in Pydantic version 2, the method is called Item.model_json_schema().

Nevertheless, although we are not using the default integrated functionality, we are still using a Pydantic model to manually generate the JSON Schema for the data that we want to receive in YAML.

Then we use the request directly, and extract the body as bytes. This means that FastAPI won't even try to parse the request payload as JSON.

And then in our code, we parse that YAML content directly, and then we are again using the same Pydantic model to validate the YAML content:

In Pydantic version 1 the method to parse and validate an object was Item.parse_obj(), in Pydantic version 2, the method is called Item.model_validate().

Here we reuse the same Pydantic model.

But the same way, we could have validated it in some other way.

**Examples:**

Example 1 (python):
```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/items/", operation_id="some_specific_id_you_define")
async def read_items():
    return [{"item_id": "Foo"}]
```

Example 2 (python):
```python
from fastapi import FastAPI
from fastapi.routing import APIRoute

app = FastAPI()


@app.get("/items/")
async def read_items():
    return [{"item_id": "Foo"}]


def use_route_names_as_operation_ids(app: FastAPI) -> None:
    """
    Simplify operation IDs so that generated API clients have simpler function
    names.

    Should be called only after all routes have been added.
    """
    for route in app.routes:
        if isinstance(route, APIRoute):
            route.operation_id = route.name  # in this case, 'read_items'


use_route_names_as_operation_ids(app)
```

Example 3 (python):
```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/items/", include_in_schema=False)
async def read_items():
    return [{"item_id": "Foo"}]
```

Example 4 (python):
```python
from typing import Set, Union

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class Item(BaseModel):
    name: str
    description: Union[str, None] = None
    price: float
    tax: Union[float, None] = None
    tags: Set[str] = set()


@app.post("/items/", response_model=Item, summary="Create an item")
async def create_item(item: Item):
    """
    Create an item with all the information:

    - **name**: each item must have a name
    - **description**: a long description
    - **price**: required
    - **tax**: if the item doesn't have tax, you can omit this
    - **tags**: a set of unique tag strings for this item
    \f
    :param item: User input.
    """
    return item
```

---

## Settings and Environment Variables¶

**URL:** https://fastapi.tiangolo.com/advanced/settings/

**Contents:**
- Settings and Environment Variables¶
- Types and validation¶
- Pydantic Settings¶
  - Install pydantic-settings¶
  - Create the Settings object¶
  - Use the settings¶
  - Run the server¶
- Settings in another module¶
- Settings in a dependency¶
  - The config file¶

In many cases your application could need some external settings or configurations, for example secret keys, database credentials, credentials for email services, etc.

Most of these settings are variable (can change), like database URLs. And many could be sensitive, like secrets.

For this reason it's common to provide them in environment variables that are read by the application.

To understand environment variables you can read Environment Variables.

These environment variables can only handle text strings, as they are external to Python and have to be compatible with other programs and the rest of the system (and even with different operating systems, as Linux, Windows, macOS).

That means that any value read in Python from an environment variable will be a str, and any conversion to a different type or any validation has to be done in code.

Fortunately, Pydantic provides a great utility to handle these settings coming from environment variables with Pydantic: Settings management.

First, make sure you create your virtual environment, activate it, and then install the pydantic-settings package:

It also comes included when you install the all extras with:

In Pydantic v1 it came included with the main package. Now it is distributed as this independent package so that you can choose to install it or not if you don't need that functionality.

Import BaseSettings from Pydantic and create a sub-class, very much like with a Pydantic model.

The same way as with Pydantic models, you declare class attributes with type annotations, and possibly default values.

You can use all the same validation features and tools you use for Pydantic models, like different data types and additional validations with Field().

In Pydantic v1 you would import BaseSettings directly from pydantic instead of from pydantic_settings.

If you want something quick to copy and paste, don't use this example, use the last one below.

Then, when you create an instance of that Settings class (in this case, in the settings object), Pydantic will read the environment variables in a case-insensitive way, so, an upper-case variable APP_NAME will still be read for the attribute app_name.

Next it will convert and validate the data. So, when you use that settings object, you will have data of the types you declared (e.g. items_per_user will be an int).

Then you can use the new settings object in your application:

Next, you would run the server passing the configurations as environment variables, for example you could set an ADMIN_EMAIL and APP_NAME with:

To set multiple env vars for a single command just separate them with a space, and put them all before the command.

And then the admin_email setting would be set to "deadpool@example.com".

The app_name would be "ChimichangApp".

And the items_per_user would keep its default value of 50.

You could put those settings in another module file as you saw in Bigger Applications - Multiple Files.

For example, you could have a file config.py with:

And then use it in a file main.py:

You would also need a file __init__.py as you saw in Bigger Applications - Multiple Files.

In some occasions it might be useful to provide the settings from a dependency, instead of having a global object with settings that is used everywhere.

This could be especially useful during testing, as it's very easy to override a dependency with your own custom settings.

Coming from the previous example, your config.py file could look like:

Notice that now we don't create a default instance settings = Settings().

Now we create a dependency that returns a new config.Settings().

We'll discuss the @lru_cache in a bit.

For now you can assume get_settings() is a normal function.

And then we can require it from the path operation function as a dependency and use it anywhere we need it.

Then it would be very easy to provide a different settings object during testing by creating a dependency override for get_settings:

In the dependency override we set a new value for the admin_email when creating the new Settings object, and then we return that new object.

Then we can test that it is used.

If you have many settings that possibly change a lot, maybe in different environments, it might be useful to put them on a file and then read them from it as if they were environment variables.

This practice is common enough that it has a name, these environment variables are commonly placed in a file .env, and the file is called a "dotenv".

A file starting with a dot (.) is a hidden file in Unix-like systems, like Linux and macOS.

But a dotenv file doesn't really have to have that exact filename.

Pydantic has support for reading from these types of files using an external library. You can read more at Pydantic Settings: Dotenv (.env) support.

For this to work, you need to pip install python-dotenv.

You could have a .env file with:

And then update your config.py with:

The model_config attribute is used just for Pydantic configuration. You can read more at Pydantic: Concepts: Configuration.

The Config class is used just for Pydantic configuration. You can read more at Pydantic Model Config.

In Pydantic version 1 the configuration was done in an internal class Config, in Pydantic version 2 it's done in an attribute model_config. This attribute takes a dict, and to get autocompletion and inline errors you can import and use SettingsConfigDict to define that dict.

Here we define the config env_file inside of your Pydantic Settings class, and set the value to the filename with the dotenv file we want to use.

Reading a file from disk is normally a costly (slow) operation, so you probably want to do it only once and then reuse the same settings object, instead of reading it for each request.

But every time we do:

a new Settings object would be created, and at creation it would read the .env file again.

If the dependency function was just like:

we would create that object for each request, and we would be reading the .env file for each request. ⚠️

But as we are using the @lru_cache decorator on top, the Settings object will be created only once, the first time it's called. ✔️

Then for any subsequent call of get_settings() in the dependencies for the next requests, instead of executing the internal code of get_settings() and creating a new Settings object, it will return the same object that was returned on the first call, again and again.

@lru_cache modifies the function it decorates to return the same value that was returned the first time, instead of computing it again, executing the code of the function every time.

So, the function below it will be executed once for each combination of arguments. And then the values returned by each of those combinations of arguments will be used again and again whenever the function is called with exactly the same combination of arguments.

For example, if you have a function:

your program could execute like this:

In the case of our dependency get_settings(), the function doesn't even take any arguments, so it always returns the same value.

That way, it behaves almost as if it was just a global variable. But as it uses a dependency function, then we can override it easily for testing.

@lru_cache is part of functools which is part of Python's standard library, you can read more about it in the Python docs for @lru_cache.

You can use Pydantic Settings to handle the settings or configurations for your application, with all the power of Pydantic models.

**Examples:**

Example 1 (unknown):
```unknown
$ pip install pydantic-settings
---> 100%
```

Example 2 (unknown):
```unknown
$ pip install "fastapi[all]"
---> 100%
```

Example 3 (python):
```python
from fastapi import FastAPI
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Awesome API"
    admin_email: str
    items_per_user: int = 50


settings = Settings()
app = FastAPI()


@app.get("/info")
async def info():
    return {
        "app_name": settings.app_name,
        "admin_email": settings.admin_email,
        "items_per_user": settings.items_per_user,
    }
```

Example 4 (python):
```python
from fastapi import FastAPI
from pydantic import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Awesome API"
    admin_email: str
    items_per_user: int = 50


settings = Settings()
app = FastAPI()


@app.get("/info")
async def info():
    return {
        "app_name": settings.app_name,
        "admin_email": settings.admin_email,
        "items_per_user": settings.items_per_user,
    }
```

---

## Using Dataclasses¶

**URL:** https://fastapi.tiangolo.com/advanced/dataclasses/

**Contents:**
- Using Dataclasses¶
- Dataclasses in response_model¶
- Dataclasses in Nested Data Structures¶
- Learn More¶
- Version¶

FastAPI is built on top of Pydantic, and I have been showing you how to use Pydantic models to declare requests and responses.

But FastAPI also supports using dataclasses the same way:

This is still supported thanks to Pydantic, as it has internal support for dataclasses.

So, even with the code above that doesn't use Pydantic explicitly, FastAPI is using Pydantic to convert those standard dataclasses to Pydantic's own flavor of dataclasses.

And of course, it supports the same:

This works the same way as with Pydantic models. And it is actually achieved in the same way underneath, using Pydantic.

Keep in mind that dataclasses can't do everything Pydantic models can do.

So, you might still need to use Pydantic models.

But if you have a bunch of dataclasses laying around, this is a nice trick to use them to power a web API using FastAPI. 🤓

You can also use dataclasses in the response_model parameter:

The dataclass will be automatically converted to a Pydantic dataclass.

This way, its schema will show up in the API docs user interface:

You can also combine dataclasses with other type annotations to make nested data structures.

In some cases, you might still have to use Pydantic's version of dataclasses. For example, if you have errors with the automatically generated API documentation.

In that case, you can simply swap the standard dataclasses with pydantic.dataclasses, which is a drop-in replacement:

We still import field from standard dataclasses.

pydantic.dataclasses is a drop-in replacement for dataclasses.

The Author dataclass includes a list of Item dataclasses.

The Author dataclass is used as the response_model parameter.

You can use other standard type annotations with dataclasses as the request body.

In this case, it's a list of Item dataclasses.

Here we are returning a dictionary that contains items which is a list of dataclasses.

FastAPI is still capable of serializing the data to JSON.

Here the response_model is using a type annotation of a list of Author dataclasses.

Again, you can combine dataclasses with standard type annotations.

Notice that this path operation function uses regular def instead of async def.

As always, in FastAPI you can combine def and async def as needed.

If you need a refresher about when to use which, check out the section "In a hurry?" in the docs about async and await.

This path operation function is not returning dataclasses (although it could), but a list of dictionaries with internal data.

FastAPI will use the response_model parameter (that includes dataclasses) to convert the response.

You can combine dataclasses with other type annotations in many different combinations to form complex data structures.

Check the in-code annotation tips above to see more specific details.

You can also combine dataclasses with other Pydantic models, inherit from them, include them in your own models, etc.

To learn more, check the Pydantic docs about dataclasses.

This is available since FastAPI version 0.67.0. 🔖

**Examples:**

Example 1 (python):
```python
from dataclasses import dataclass
from typing import Union

from fastapi import FastAPI


@dataclass
class Item:
    name: str
    price: float
    description: Union[str, None] = None
    tax: Union[float, None] = None


app = FastAPI()


@app.post("/items/")
async def create_item(item: Item):
    return item
```

Example 2 (python):
```python
from dataclasses import dataclass, field
from typing import List, Union

from fastapi import FastAPI


@dataclass
class Item:
    name: str
    price: float
    tags: List[str] = field(default_factory=list)
    description: Union[str, None] = None
    tax: Union[float, None] = None


app = FastAPI()


@app.get("/items/next", response_model=Item)
async def read_next_item():
    return {
        "name": "Island In The Moon",
        "price": 12.99,
        "description": "A place to be playin' and havin' fun",
        "tags": ["breater"],
    }
```

Example 3 (python):
```python
from dataclasses import field  # (1)
from typing import List, Union

from fastapi import FastAPI
from pydantic.dataclasses import dataclass  # (2)


@dataclass
class Item:
    name: str
    description: Union[str, None] = None


@dataclass
class Author:
    name: str
    items: List[Item] = field(default_factory=list)  # (3)


app = FastAPI()


@app.post("/authors/{author_id}/items/", response_model=Author)  # (4)
async def create_author_items(author_id: str, items: List[Item]):  # (5)
    return {"name": author_id, "items": items}  # (6)


@app.get("/authors/", response_model=List[Author])  # (7)
def get_authors():  # (8)
    return [  # (9)
        {
            "name": "Breaters",
            "items": [
                {
                    "name": "Island In The Moon",
                    "description": "A place to be playin' and havin' fun",
                },
                {"name": "Holy Buddies"},
            ],
        },
        {
            "name": "System of an Up",
            "items": [
                {
                    "name": "Salt",
                    "description": "The kombucha mushroom people's favorite",
                },
                {"name": "Pad Thai"},
                {
                    "name": "Lonely Night",
                    "description": "The mostests lonliest nightiest of allest",
                },
            ],
        },
    ]
```

---

## WebSockets¶

**URL:** https://fastapi.tiangolo.com/advanced/websockets/

**Contents:**
- WebSockets¶
- Install websockets¶
- WebSockets client¶
  - In production¶
- Create a websocket¶
- Await for messages and send messages¶
- Try it¶
- Using Depends and others¶
  - Try the WebSockets with dependencies¶
- Handling disconnections and multiple clients¶

You can use WebSockets with FastAPI.

Make sure you create a virtual environment, activate it, and install websockets (a Python library that makes it easy to use the "WebSocket" protocol):

In your production system, you probably have a frontend created with a modern framework like React, Vue.js or Angular.

And to communicate using WebSockets with your backend you would probably use your frontend's utilities.

Or you might have a native mobile application that communicates with your WebSocket backend directly, in native code.

Or you might have any other way to communicate with the WebSocket endpoint.

But for this example, we'll use a very simple HTML document with some JavaScript, all inside a long string.

This, of course, is not optimal and you wouldn't use it for production.

In production you would have one of the options above.

But it's the simplest way to focus on the server-side of WebSockets and have a working example:

In your FastAPI application, create a websocket:

You could also use from starlette.websockets import WebSocket.

FastAPI provides the same WebSocket directly just as a convenience for you, the developer. But it comes directly from Starlette.

In your WebSocket route you can await for messages and send messages.

You can receive and send binary, text, and JSON data.

If your file is named main.py, run your application with:

Open your browser at http://127.0.0.1:8000.

You will see a simple page like:

You can type messages in the input box, and send them:

And your FastAPI application with WebSockets will respond back:

You can send (and receive) many messages:

And all of them will use the same WebSocket connection.

In WebSocket endpoints you can import from fastapi and use:

They work the same way as for other FastAPI endpoints/path operations:

Prefer to use the Annotated version if possible.

Prefer to use the Annotated version if possible.

As this is a WebSocket it doesn't really make sense to raise an HTTPException, instead we raise a WebSocketException.

You can use a closing code from the valid codes defined in the specification.

If your file is named main.py, run your application with:

Open your browser at http://127.0.0.1:8000.

Notice that the query token will be handled by a dependency.

With that you can connect the WebSocket and then send and receive messages:

When a WebSocket connection is closed, the await websocket.receive_text() will raise a WebSocketDisconnect exception, which you can then catch and handle like in this example.

That will raise the WebSocketDisconnect exception, and all the other clients will receive a message like:

The app above is a minimal and simple example to demonstrate how to handle and broadcast messages to several WebSocket connections.

But keep in mind that, as everything is handled in memory, in a single list, it will only work while the process is running, and will only work with a single process.

If you need something easy to integrate with FastAPI but that is more robust, supported by Redis, PostgreSQL or others, check encode/broadcaster.

To learn more about the options, check Starlette's documentation for:

**Examples:**

Example 1 (unknown):
```unknown
$ pip install websockets

---> 100%
```

Example 2 (python):
```python
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse

app = FastAPI()

html = """
<!DOCTYPE html>
<html>
    <head>
        <title>Chat</title>
    </head>
    <body>
        <h1>WebSocket Chat</h1>
        <form action="" onsubmit="sendMessage(event)">
            <input type="text" id="messageText" autocomplete="off"/>
            <button>Send</button>
        </form>
        <ul id='messages'>
        </ul>
        <script>
            var ws = new WebSocket("ws://localhost:8000/ws");
            ws.onmessage = function(event) {
                var messages = document.getElementById('messages')
                var message = document.createElement('li')
                var content = document.createTextNode(event.data)
                message.appendChild(content)
                messages.appendChild(message)
            };
            function sendMessage(event) {
                var input = document.getElementById("messageText")
                ws.send(input.value)
                input.value = ''
                event.preventDefault()
            }
        </script>
    </body>
</html>
"""


@app.get("/")
async def get():
    return HTMLResponse(html)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Message text was: {data}")
```

Example 3 (python):
```python
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse

app = FastAPI()

html = """
<!DOCTYPE html>
<html>
    <head>
        <title>Chat</title>
    </head>
    <body>
        <h1>WebSocket Chat</h1>
        <form action="" onsubmit="sendMessage(event)">
            <input type="text" id="messageText" autocomplete="off"/>
            <button>Send</button>
        </form>
        <ul id='messages'>
        </ul>
        <script>
            var ws = new WebSocket("ws://localhost:8000/ws");
            ws.onmessage = function(event) {
                var messages = document.getElementById('messages')
                var message = document.createElement('li')
                var content = document.createTextNode(event.data)
                message.appendChild(content)
                messages.appendChild(message)
            };
            function sendMessage(event) {
                var input = document.getElementById("messageText")
                ws.send(input.value)
                input.value = ''
                event.preventDefault()
            }
        </script>
    </body>
</html>
"""


@app.get("/")
async def get():
    return HTMLResponse(html)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Message text was: {data}")
```

Example 4 (python):
```python
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse

app = FastAPI()

html = """
<!DOCTYPE html>
<html>
    <head>
        <title>Chat</title>
    </head>
    <body>
        <h1>WebSocket Chat</h1>
        <form action="" onsubmit="sendMessage(event)">
            <input type="text" id="messageText" autocomplete="off"/>
            <button>Send</button>
        </form>
        <ul id='messages'>
        </ul>
        <script>
            var ws = new WebSocket("ws://localhost:8000/ws");
            ws.onmessage = function(event) {
                var messages = document.getElementById('messages')
                var message = document.createElement('li')
                var content = document.createTextNode(event.data)
                message.appendChild(content)
                messages.appendChild(message)
            };
            function sendMessage(event) {
                var input = document.getElementById("messageText")
                ws.send(input.value)
                input.value = ''
                event.preventDefault()
            }
        </script>
    </body>
</html>
"""


@app.get("/")
async def get():
    return HTMLResponse(html)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Message text was: {data}")
```

---

## 

**URL:** https://fastapi.tiangolo.com/advanced/graphql/

---

## 

**URL:** https://fastapi.tiangolo.com/advanced/extending-openapi/

---
