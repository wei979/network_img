# Fastapi - Api

**Pages:** 20

---

## Benchmarks¶

**URL:** https://fastapi.tiangolo.com/benchmarks/

**Contents:**
- Benchmarks¶
- Benchmarks and speed¶

Independent TechEmpower benchmarks show FastAPI applications running under Uvicorn as one of the fastest Python frameworks available, only below Starlette and Uvicorn themselves (used internally by FastAPI).

But when checking benchmarks and comparisons you should keep the following in mind.

When you check the benchmarks, it is common to see several tools of different types compared as equivalent.

Specifically, to see Uvicorn, Starlette and FastAPI compared together (among many other tools).

The simpler the problem solved by the tool, the better performance it will get. And most of the benchmarks don't test the additional features provided by the tool.

The hierarchy is like:

Uvicorn: an ASGI server

---

## Concurrency and async / await¶

**URL:** https://fastapi.tiangolo.com/async/

**Contents:**
- Concurrency and async / await¶
- In a hurry?¶
- Technical Details¶
- Asynchronous Code¶
  - Concurrency and Burgers¶
  - Concurrent Burgers¶
  - Parallel Burgers¶
  - Burger Conclusion¶
  - Is concurrency better than parallelism?¶
  - Concurrency + Parallelism: Web + Machine Learning¶

Details about the async def syntax for path operation functions and some background about asynchronous code, concurrency, and parallelism.

If you are using third party libraries that tell you to call them with await, like:

Then, declare your path operation functions with async def like:

You can only use await inside of functions created with async def.

If you are using a third party library that communicates with something (a database, an API, the file system, etc.) and doesn't have support for using await, (this is currently the case for most database libraries), then declare your path operation functions as normally, with just def, like:

If your application (somehow) doesn't have to communicate with anything else and wait for it to respond, use async def, even if you don't need to use await inside.

If you just don't know, use normal def.

Note: You can mix def and async def in your path operation functions as much as you need and define each one using the best option for you. FastAPI will do the right thing with them.

Anyway, in any of the cases above, FastAPI will still work asynchronously and be extremely fast.

But by following the steps above, it will be able to do some performance optimizations.

Modern versions of Python have support for "asynchronous code" using something called "coroutines", with async and await syntax.

Let's see that phrase by parts in the sections below:

Asynchronous code just means that the language 💬 has a way to tell the computer / program 🤖 that at some point in the code, it 🤖 will have to wait for something else to finish somewhere else. Let's say that something else is called "slow-file" 📝.

So, during that time, the computer can go and do some other work, while "slow-file" 📝 finishes.

Then the computer / program 🤖 will come back every time it has a chance because it's waiting again, or whenever it 🤖 finished all the work it had at that point. And it 🤖 will see if any of the tasks it was waiting for have already finished, doing whatever it had to do.

Next, it 🤖 takes the first task to finish (let's say, our "slow-file" 📝) and continues whatever it had to do with it.

That "wait for something else" normally refers to I/O operations that are relatively "slow" (compared to the speed of the processor and the RAM memory), like waiting for:

As the execution time is consumed mostly by waiting for I/O operations, they call them "I/O bound" operations.

It's called "asynchronous" because the computer / program doesn't have to be "synchronized" with the slow task, waiting for the exact moment that the task finishes, while doing nothing, to be able to take the task result and continue the work.

Instead of that, by being an "asynchronous" system, once finished, the task can wait in line a little bit (some microseconds) for the computer / program to finish whatever it went to do, and then come back to take the results and continue working with them.

For "synchronous" (contrary to "asynchronous") they commonly also use the term "sequential", because the computer / program follows all the steps in sequence before switching to a different task, even if those steps involve waiting.

This idea of asynchronous code described above is also sometimes called "concurrency". It is different from "parallelism".

Concurrency and parallelism both relate to "different things happening more or less at the same time".

But the details between concurrency and parallelism are quite different.

To see the difference, imagine the following story about burgers:

You go with your crush to get fast food, you stand in line while the cashier takes the orders from the people in front of you. 😍

Then it's your turn, you place your order of 2 very fancy burgers for your crush and you. 🍔🍔

The cashier says something to the cook in the kitchen so they know they have to prepare your burgers (even though they are currently preparing the ones for the previous clients).

The cashier gives you the number of your turn.

While you are waiting, you go with your crush and pick a table, you sit and talk with your crush for a long time (as your burgers are very fancy and take some time to prepare).

As you are sitting at the table with your crush, while you wait for the burgers, you can spend that time admiring how awesome, cute and smart your crush is ✨😍✨.

While waiting and talking to your crush, from time to time, you check the number displayed on the counter to see if it's your turn already.

Then at some point, it finally is your turn. You go to the counter, get your burgers and come back to the table.

You and your crush eat the burgers and have a nice time. ✨

Beautiful illustrations by Ketrina Thompson. 🎨

Imagine you are the computer / program 🤖 in that story.

While you are at the line, you are just idle 😴, waiting for your turn, not doing anything very "productive". But the line is fast because the cashier is only taking the orders (not preparing them), so that's fine.

Then, when it's your turn, you do actual "productive" work, you process the menu, decide what you want, get your crush's choice, pay, check that you give the correct bill or card, check that you are charged correctly, check that the order has the correct items, etc.

But then, even though you still don't have your burgers, your work with the cashier is "on pause" ⏸, because you have to wait 🕙 for your burgers to be ready.

But as you go away from the counter and sit at the table with a number for your turn, you can switch 🔀 your attention to your crush, and "work" ⏯ 🤓 on that. Then you are again doing something very "productive" as is flirting with your crush 😍.

Then the cashier 💁 says "I'm finished with doing the burgers" by putting your number on the counter's display, but you don't jump like crazy immediately when the displayed number changes to your turn number. You know no one will steal your burgers because you have the number of your turn, and they have theirs.

So you wait for your crush to finish the story (finish the current work ⏯ / task being processed 🤓), smile gently and say that you are going for the burgers ⏸.

Then you go to the counter 🔀, to the initial task that is now finished ⏯, pick the burgers, say thanks and take them to the table. That finishes that step / task of interaction with the counter ⏹. That in turn, creates a new task, of "eating burgers" 🔀 ⏯, but the previous one of "getting burgers" is finished ⏹.

Now let's imagine these aren't "Concurrent Burgers", but "Parallel Burgers".

You go with your crush to get parallel fast food.

You stand in line while several (let's say 8) cashiers that at the same time are cooks take the orders from the people in front of you.

Everyone before you is waiting for their burgers to be ready before leaving the counter because each of the 8 cashiers goes and prepares the burger right away before getting the next order.

Then it's finally your turn, you place your order of 2 very fancy burgers for your crush and you.

The cashier goes to the kitchen.

You wait, standing in front of the counter 🕙, so that no one else takes your burgers before you do, as there are no numbers for turns.

As you and your crush are busy not letting anyone get in front of you and take your burgers whenever they arrive, you cannot pay attention to your crush. 😞

This is "synchronous" work, you are "synchronized" with the cashier/cook 👨‍🍳. You have to wait 🕙 and be there at the exact moment that the cashier/cook 👨‍🍳 finishes the burgers and gives them to you, or otherwise, someone else might take them.

Then your cashier/cook 👨‍🍳 finally comes back with your burgers, after a long time waiting 🕙 there in front of the counter.

You take your burgers and go to the table with your crush.

You just eat them, and you are done. ⏹

There was not much talk or flirting as most of the time was spent waiting 🕙 in front of the counter. 😞

Beautiful illustrations by Ketrina Thompson. 🎨

In this scenario of the parallel burgers, you are a computer / program 🤖 with two processors (you and your crush), both waiting 🕙 and dedicating their attention ⏯ to be "waiting on the counter" 🕙 for a long time.

The fast food store has 8 processors (cashiers/cooks). While the concurrent burgers store might have had only 2 (one cashier and one cook).

But still, the final experience is not the best. 😞

This would be the parallel equivalent story for burgers. 🍔

For a more "real life" example of this, imagine a bank.

Up to recently, most of the banks had multiple cashiers 👨‍💼👨‍💼👨‍💼👨‍💼 and a big line 🕙🕙🕙🕙🕙🕙🕙🕙.

All of the cashiers doing all the work with one client after the other 👨‍💼⏯.

And you have to wait 🕙 in the line for a long time or you lose your turn.

You probably wouldn't want to take your crush 😍 with you to run errands at the bank 🏦.

In this scenario of "fast food burgers with your crush", as there is a lot of waiting 🕙, it makes a lot more sense to have a concurrent system ⏸🔀⏯.

This is the case for most of the web applications.

Many, many users, but your server is waiting 🕙 for their not-so-good connection to send their requests.

And then waiting 🕙 again for the responses to come back.

This "waiting" 🕙 is measured in microseconds, but still, summing it all, it's a lot of waiting in the end.

That's why it makes a lot of sense to use asynchronous ⏸🔀⏯ code for web APIs.

This kind of asynchronicity is what made NodeJS popular (even though NodeJS is not parallel) and that's the strength of Go as a programming language.

And that's the same level of performance you get with FastAPI.

And as you can have parallelism and asynchronicity at the same time, you get higher performance than most of the tested NodeJS frameworks and on par with Go, which is a compiled language closer to C (all thanks to Starlette).

Nope! That's not the moral of the story.

Concurrency is different than parallelism. And it is better on specific scenarios that involve a lot of waiting. Because of that, it generally is a lot better than parallelism for web application development. But not for everything.

So, to balance that out, imagine the following short story:

You have to clean a big, dirty house.

Yep, that's the whole story.

There's no waiting 🕙 anywhere, just a lot of work to be done, on multiple places of the house.

You could have turns as in the burgers example, first the living room, then the kitchen, but as you are not waiting 🕙 for anything, just cleaning and cleaning, the turns wouldn't affect anything.

It would take the same amount of time to finish with or without turns (concurrency) and you would have done the same amount of work.

But in this case, if you could bring the 8 ex-cashier/cooks/now-cleaners, and each one of them (plus you) could take a zone of the house to clean it, you could do all the work in parallel, with the extra help, and finish much sooner.

In this scenario, each one of the cleaners (including you) would be a processor, doing their part of the job.

And as most of the execution time is taken by actual work (instead of waiting), and the work in a computer is done by a CPU, they call these problems "CPU bound".

Common examples of CPU bound operations are things that require complex math processing.

With FastAPI you can take advantage of concurrency that is very common for web development (the same main attraction of NodeJS).

But you can also exploit the benefits of parallelism and multiprocessing (having multiple processes running in parallel) for CPU bound workloads like those in Machine Learning systems.

That, plus the simple fact that Python is the main language for Data Science, Machine Learning and especially Deep Learning, make FastAPI a very good match for Data Science / Machine Learning web APIs and applications (among many others).

To see how to achieve this parallelism in production see the section about Deployment.

Modern versions of Python have a very intuitive way to define asynchronous code. This makes it look just like normal "sequential" code and do the "awaiting" for you at the right moments.

When there is an operation that will require waiting before giving the results and has support for these new Python features, you can code it like:

The key here is the await. It tells Python that it has to wait ⏸ for get_burgers(2) to finish doing its thing 🕙 before storing the results in burgers. With that, Python will know that it can go and do something else 🔀 ⏯ in the meanwhile (like receiving another request).

For await to work, it has to be inside a function that supports this asynchronicity. To do that, you just declare it with async def:

With async def, Python knows that, inside that function, it has to be aware of await expressions, and that it can "pause" ⏸ the execution of that function and go do something else 🔀 before coming back.

When you want to call an async def function, you have to "await" it. So, this won't work:

So, if you are using a library that tells you that you can call it with await, you need to create the path operation functions that uses it with async def, like in:

You might have noticed that await can only be used inside of functions defined with async def.

But at the same time, functions defined with async def have to be "awaited". So, functions with async def can only be called inside of functions defined with async def too.

So, about the egg and the chicken, how do you call the first async function?

If you are working with FastAPI you don't have to worry about that, because that "first" function will be your path operation function, and FastAPI will know how to do the right thing.

But if you want to use async / await without FastAPI, you can do it as well.

Starlette (and FastAPI) are based on AnyIO, which makes it compatible with both Python's standard library asyncio and Trio.

In particular, you can directly use AnyIO for your advanced concurrency use cases that require more advanced patterns in your own code.

And even if you were not using FastAPI, you could also write your own async applications with AnyIO to be highly compatible and get its benefits (e.g. structured concurrency).

I created another library on top of AnyIO, as a thin layer on top, to improve a bit the type annotations and get better autocompletion, inline errors, etc. It also has a friendly introduction and tutorial to help you understand and write your own async code: Asyncer. It would be particularly useful if you need to combine async code with regular (blocking/synchronous) code.

This style of using async and await is relatively new in the language.

But it makes working with asynchronous code a lot easier.

This same syntax (or almost identical) was also included recently in modern versions of JavaScript (in Browser and NodeJS).

But before that, handling asynchronous code was quite more complex and difficult.

In previous versions of Python, you could have used threads or Gevent. But the code is way more complex to understand, debug, and think about.

In previous versions of NodeJS / Browser JavaScript, you would have used "callbacks". Which leads to "callback hell".

Coroutine is just the very fancy term for the thing returned by an async def function. Python knows that it is something like a function, that it can start and that it will end at some point, but that it might be paused ⏸ internally too, whenever there is an await inside of it.

But all this functionality of using asynchronous code with async and await is many times summarized as using "coroutines". It is comparable to the main key feature of Go, the "Goroutines".

Let's see the same phrase from above:

Modern versions of Python have support for "asynchronous code" using something called "coroutines", with async and await syntax.

That should make more sense now. ✨

All that is what powers FastAPI (through Starlette) and what makes it have such an impressive performance.

You can probably skip this.

These are very technical details of how FastAPI works underneath.

If you have quite some technical knowledge (coroutines, threads, blocking, etc.) and are curious about how FastAPI handles async def vs normal def, go ahead.

When you declare a path operation function with normal def instead of async def, it is run in an external threadpool that is then awaited, instead of being called directly (as it would block the server).

If you are coming from another async framework that does not work in the way described above and you are used to defining trivial compute-only path operation functions with plain def for a tiny performance gain (about 100 nanoseconds), please note that in FastAPI the effect would be quite opposite. In these cases, it's better to use async def unless your path operation functions use code that performs blocking I/O.

Still, in both situations, chances are that FastAPI will still be faster than (or at least comparable to) your previous framework.

The same applies for dependencies. If a dependency is a standard def function instead of async def, it is run in the external threadpool.

You can have multiple dependencies and sub-dependencies requiring each other (as parameters of the function definitions), some of them might be created with async def and some with normal def. It would still work, and the ones created with normal def would be called on an external thread (from the threadpool) instead of being "awaited".

Any other utility function that you call directly can be created with normal def or async def and FastAPI won't affect the way you call it.

This is in contrast to the functions that FastAPI calls for you: path operation functions and dependencies.

If your utility function is a normal function with def, it will be called directly (as you write it in your code), not in a threadpool, if the function is created with async def then you should await for that function when you call it in your code.

Again, these are very technical details that would probably be useful if you came searching for them.

Otherwise, you should be good with the guidelines from the section above: In a hurry?.

**Examples:**

Example 1 (unknown):
```unknown
results = await some_library()
```

Example 2 (python):
```python
@app.get('/')
async def read_results():
    results = await some_library()
    return results
```

Example 3 (python):
```python
@app.get('/')
def results():
    results = some_library()
    return results
```

Example 4 (unknown):
```unknown
burgers = await get_burgers(2)
```

---

## Development - Contributing¶

**URL:** https://fastapi.tiangolo.com/contributing/

**Contents:**
- Development - Contributing¶
- Developing¶
  - Virtual environment¶
  - Install requirements¶
  - Using your local FastAPI¶
  - Format the code¶
- Tests¶
- Docs¶
  - Docs live¶
    - Typer CLI (optional)¶

First, you might want to see the basic ways to help FastAPI and get help.

If you already cloned the fastapi repository and you want to deep dive in the code, here are some guidelines to set up your environment.

Follow the instructions to create and activate a virtual environment for the internal code of fastapi.

After activating the environment, install the required packages:

It will install all the dependencies and your local FastAPI in your local environment.

If you create a Python file that imports and uses FastAPI, and run it with the Python from your local environment, it will use your cloned local FastAPI source code.

And if you update that local FastAPI source code when you run that Python file again, it will use the fresh version of FastAPI you just edited.

That way, you don't have to "install" your local version to be able to test every change.

This only happens when you install using this included requirements.txt instead of running pip install fastapi directly.

That is because inside the requirements.txt file, the local version of FastAPI is marked to be installed in "editable" mode, with the -e option.

There is a script that you can run that will format and clean all your code:

It will also auto-sort all your imports.

There is a script that you can run locally to test all the code and generate coverage reports in HTML:

This command generates a directory ./htmlcov/, if you open the file ./htmlcov/index.html in your browser, you can explore interactively the regions of code that are covered by the tests, and notice if there is any region missing.

First, make sure you set up your environment as described above, that will install all the requirements.

During local development, there is a script that builds the site and checks for any changes, live-reloading:

It will serve the documentation on http://127.0.0.1:8008.

That way, you can edit the documentation/source files and see the changes live.

Alternatively, you can perform the same steps that scripts does manually.

Go into the language directory, for the main docs in English it's at docs/en/:

Then run mkdocs in that directory:

The instructions here show you how to use the script at ./scripts/docs.py with the python program directly.

But you can also use Typer CLI, and you will get autocompletion in your terminal for the commands after installing completion.

If you install Typer CLI, you can install completion with:

The documentation uses MkDocs.

And there are extra tools/scripts in place to handle translations in ./scripts/docs.py.

You don't need to see the code in ./scripts/docs.py, you just use it in the command line.

All the documentation is in Markdown format in the directory ./docs/en/.

Many of the tutorials have blocks of code.

In most of the cases, these blocks of code are actual complete applications that can be run as is.

In fact, those blocks of code are not written inside the Markdown, they are Python files in the ./docs_src/ directory.

And those Python files are included/injected in the documentation when generating the site.

Most of the tests actually run against the example source files in the documentation.

This helps to make sure that:

If you run the examples with, e.g.:

as Uvicorn by default will use the port 8000, the documentation on port 8008 won't clash.

Update on Translations

We're updating the way we handle documentation translations.

Until now, we invited community members to translate pages via pull requests, which were then reviewed by at least two native speakers. While this has helped bring FastAPI to many more users, we’ve also run into several challenges - some languages have only a few translated pages, others are outdated and hard to maintain over time. To improve this, we’re working on automation tools 🤖 to manage translations more efficiently. Once ready, documentation will be machine-translated and still reviewed by at least two native speakers ✅ before publishing. This will allow us to keep translations up-to-date while reducing the review burden on maintainers.

🚫 We’re no longer accepting new community-submitted translation PRs.

⏳ Existing open PRs will be reviewed and can still be merged if completed within the next 3 weeks (since July 11 2025).

🌐 In the future, we will only support languages where at least three active native speakers are available to review and maintain translations.

This transition will help us keep translations more consistent and timely while better supporting our contributors 🙌. Thank you to everyone who has contributed so far — your help has been invaluable! 💖

Help with translations is VERY MUCH appreciated! And it can't be done without the help from the community. 🌎 🚀

Here are the steps to help with translations.

Check the currently existing pull requests for your language. You can filter the pull requests by the ones with the label for your language. For example, for Spanish, the label is lang-es.

Review those pull requests, requesting changes or approving them. For the languages I don't speak, I'll wait for several others to review the translation before merging.

You can add comments with change suggestions to existing pull requests.

Check the docs about adding a pull request review to approve it or request changes.

Check if there's a GitHub Discussion to coordinate translations for your language. You can subscribe to it, and when there's a new pull request to review, an automatic comment will be added to the discussion.

If you translate pages, add a single pull request per page translated. That will make it much easier for others to review it.

To check the 2-letter code for the language you want to translate, you can use the table List of ISO 639-1 codes.

Let's say you want to translate a page for a language that already has translations for some pages, like Spanish.

In the case of Spanish, the 2-letter code is es. So, the directory for Spanish translations is located at docs/es/.

The main ("official") language is English, located at docs/en/.

Now run the live server for the docs in Spanish:

Alternatively, you can perform the same steps that scripts does manually.

Go into the language directory, for the Spanish translations it's at docs/es/:

Then run mkdocs in that directory:

Now you can go to http://127.0.0.1:8008 and see your changes live.

You will see that every language has all the pages. But some pages are not translated and have an info box at the top, about the missing translation.

Now let's say that you want to add a translation for the section Features.

Notice that the only change in the path and file name is the language code, from en to es.

If you go to your browser you will see that now the docs show your new section (the info box at the top is gone). 🎉

Now you can translate it all and see how it looks as you save the file.

Some of these files are updated very frequently and a translation would always be behind, or they include the main content from English source files, etc.

Let's say that you want to request translations for a language that is not yet translated, not even some pages. For example, Latin.

If there is no discussion for that language, you can start by requesting the new language. For that, you can follow these steps:

Once there are several people in the discussion, the FastAPI team can evaluate it and can make it an official translation.

Then the docs will be automatically translated using AI, and the team of native speakers can review the translation, and help tweak the AI prompts.

Once there's a new translation, for example if docs are updated or there's a new section, there will be a comment in the same discussion with the link to the new translation to review.

These steps will be performed by the FastAPI team.

Checking the link from above (List of ISO 639-1 codes), you can see that the 2-letter code for Latin is la.

Now you can create a new directory for the new language, running the following script:

Now you can check in your code editor the newly created directory docs/la/.

That command created a file docs/la/mkdocs.yml with a simple config that inherits everything from the en version:

You could also simply create that file with those contents manually.

That command also created a dummy file docs/la/index.md for the main page, you can start by translating that one.

You can continue with the previous instructions for an "Existing Language" for that process.

You can make the first pull request with those two files, docs/la/mkdocs.yml and docs/la/index.md. 🎉

As already mentioned above, you can use the ./scripts/docs.py with the live command to preview the results (or mkdocs serve).

Once you are done, you can also test it all as it would look online, including all the other languages.

To do that, first build all the docs:

This builds all those independent MkDocs sites for each language, combines them, and generates the final output at ./site/.

Then you can serve that with the command serve:

Translate only the Markdown documents (.md). Do not translate the code examples at ./docs_src.

In code blocks within the Markdown document, translate comments (# a comment), but leave the rest unchanged.

Do not change anything enclosed in "``" (inline code).

In lines starting with /// translate only the text part after |. Leave the rest unchanged.

You can translate info boxes like /// warning with for example /// warning | Achtung. But do not change the word immediately after the ///, it determines the color of the info box.

Do not change the paths in links to images, code files, Markdown documents.

However, when a Markdown document is translated, the #hash-parts in links to its headings may change. Update these links if possible.

**Examples:**

Example 1 (unknown):
```unknown
$ pip install -r requirements.txt

---> 100%
```

Example 2 (unknown):
```unknown
$ uv pip install -r requirements.txt

---> 100%
```

Example 3 (unknown):
```unknown
$ bash scripts/format.sh
```

Example 4 (unknown):
```unknown
$ bash scripts/test-cov-html.sh
```

---

## Environment Variables¶

**URL:** https://fastapi.tiangolo.com/environment-variables/

**Contents:**
- Environment Variables¶
- Create and Use Env Vars¶
- Read env vars in Python¶
- Types and Validation¶
- PATH Environment Variable¶
  - Installing Python and Updating the PATH¶
- Conclusion¶

If you already know what "environment variables" are and how to use them, feel free to skip this.

An environment variable (also known as "env var") is a variable that lives outside of the Python code, in the operating system, and could be read by your Python code (or by other programs as well).

Environment variables could be useful for handling application settings, as part of the installation of Python, etc.

You can create and use environment variables in the shell (terminal), without needing Python:

You could also create environment variables outside of Python, in the terminal (or with any other method), and then read them in Python.

For example you could have a file main.py with:

The second argument to os.getenv() is the default value to return.

If not provided, it's None by default, here we provide "World" as the default value to use.

Then you could call that Python program:

As environment variables can be set outside of the code, but can be read by the code, and don't have to be stored (committed to git) with the rest of the files, it's common to use them for configurations or settings.

You can also create an environment variable only for a specific program invocation, that is only available to that program, and only for its duration.

To do that, create it right before the program itself, on the same line:

You can read more about it at The Twelve-Factor App: Config.

These environment variables can only handle text strings, as they are external to Python and have to be compatible with other programs and the rest of the system (and even with different operating systems, as Linux, Windows, macOS).

That means that any value read in Python from an environment variable will be a str, and any conversion to a different type or any validation has to be done in code.

You will learn more about using environment variables for handling application settings in the Advanced User Guide - Settings and Environment Variables.

There is a special environment variable called PATH that is used by the operating systems (Linux, macOS, Windows) to find programs to run.

The value of the variable PATH is a long string that is made of directories separated by a colon : on Linux and macOS, and by a semicolon ; on Windows.

For example, the PATH environment variable could look like this:

This means that the system should look for programs in the directories:

This means that the system should look for programs in the directories:

When you type a command in the terminal, the operating system looks for the program in each of those directories listed in the PATH environment variable.

For example, when you type python in the terminal, the operating system looks for a program called python in the first directory in that list.

If it finds it, then it will use it. Otherwise it keeps looking in the other directories.

When you install Python, you might be asked if you want to update the PATH environment variable.

Let's say you install Python and it ends up in a directory /opt/custompython/bin.

If you say yes to update the PATH environment variable, then the installer will add /opt/custompython/bin to the PATH environment variable.

It could look like this:

This way, when you type python in the terminal, the system will find the Python program in /opt/custompython/bin (the last directory) and use that one.

Let's say you install Python and it ends up in a directory C:\opt\custompython\bin.

If you say yes to update the PATH environment variable, then the installer will add C:\opt\custompython\bin to the PATH environment variable.

This way, when you type python in the terminal, the system will find the Python program in C:\opt\custompython\bin (the last directory) and use that one.

The system will find the python program in /opt/custompython/bin and run it.

It would be roughly equivalent to typing:

The system will find the python program in C:\opt\custompython\bin\python and run it.

It would be roughly equivalent to typing:

This information will be useful when learning about Virtual Environments.

With this you should have a basic understanding of what environment variables are and how to use them in Python.

You can also read more about them in the Wikipedia for Environment Variable.

In many cases it's not very obvious how environment variables would be useful and applicable right away. But they keep showing up in many different scenarios when you are developing, so it's good to know about them.

For example, you will need this information in the next section, about Virtual Environments.

**Examples:**

Example 1 (unknown):
```unknown
// You could create an env var MY_NAME with
$ export MY_NAME="Wade Wilson"

// Then you could use it with other programs, like
$ echo "Hello $MY_NAME"

Hello Wade Wilson
```

Example 2 (unknown):
```unknown
// Create an env var MY_NAME
$ $Env:MY_NAME = "Wade Wilson"

// Use it with other programs, like
$ echo "Hello $Env:MY_NAME"

Hello Wade Wilson
```

Example 3 (python):
```python
import os

name = os.getenv("MY_NAME", "World")
print(f"Hello {name} from Python")
```

Example 4 (unknown):
```unknown
// Here we don't set the env var yet
$ python main.py

// As we didn't set the env var, we get the default value

Hello World from Python

// But if we create an environment variable first
$ export MY_NAME="Wade Wilson"

// And then call the program again
$ python main.py

// Now it can read the environment variable

Hello Wade Wilson from Python
```

---

## External Links and Articles¶

**URL:** https://fastapi.tiangolo.com/external-links/

**Contents:**
- External Links and Articles¶
- Articles¶
  - English¶
  - German¶
  - Japanese¶
  - Portuguese¶
  - Russian¶
  - Vietnamese¶
  - Taiwanese¶
  - Spanish¶

FastAPI has a great community constantly growing.

There are many posts, articles, tools, and projects, related to FastAPI.

Here's an incomplete list of some of them.

If you have an article, project, tool, or anything related to FastAPI that is not yet listed here, create a Pull Request adding it.

Getting started with logging in FastAPI by Apitally.

How to profile a FastAPI asynchronous request by Balthazar Rouberol.

Deploy a Serverless FastAPI App with Neon Postgres and AWS App Runner at any scale by Stephen Siegert - Neon.

Building a Machine Learning Microservice with FastAPI by Kurtis Pykes - NVIDIA.

Booking Appointments with Twilio, Notion, and FastAPI by Ravgeet Dhillon - Twilio.

Write a Python data layer with Azure Cosmos DB and FastAPI by Abhinav Tripathi - Microsoft Blogs.

10 Tips for adding SQLAlchemy to FastAPI by Donny Peeters.

Tips on migrating from Flask to FastAPI and vice-versa by Jessica Temporal.

Explore How to Effectively Use JWT With FastAPI by Ankit Anchlia.

Instrument FastAPI with OpenTelemetry tracing and visualize traces in Grafana Tempo. by Nicoló Lino.

ML serving and monitoring with FastAPI and Evidently by Mikhail Rozhkov, Elena Samuylova.

FastAPI Tutorial in Visual Studio Code by Visual Studio Code Team.

FastAPI application monitoring made easy by Apitally.

Building a RESTful API with FastAPI: Secure Signup and Login Functionality Included by John Philip.

Building a CRUD API with FastAPI and Supabase by Keshav Malik.

Build an SMS Spam Classifier Serverless Database with FaunaDB and FastAPI by Adejumo Ridwan Suleiman.

FastAPI lambda container: serverless simplified by Raf Rasenberg.

Authorization on FastAPI with Casbin by Teresa N. Fontanella De Santis.

How to monitor FastAPI application performance using Python agent by New Relic.

Building the Poll App From Django Tutorial With FastAPI And React by Jean-Baptiste Rocher.

Seamless FastAPI Configuration with ConfZ by Silvan Melchior.

5 Advanced Features of FastAPI You Should Try by Kaustubh Gupta.

Deploying ML Models as API Using FastAPI and Heroku by Kaustubh Gupta.

Using GitHub Actions to Deploy a FastAPI Project to Heroku by Somraj Saha.

How to Create A Fake Certificate Authority And Generate TLS Certs for FastAPI by @pystar.

Building a realtime ticket booking solution with Kafka, FastAPI, and Ably by Ben Gamble.

Building simple E-Commerce with NuxtJS and FastAPI by Shahriyar(Shako) Rzayev.

Serve a machine learning model using Sklearn, FastAPI and Docker by Rodrigo Arenas.

Building an API with FastAPI and Supabase and Deploying on Deta by Yashasvi Singh.

Deploy FastAPI on Ubuntu and Serve using Caddy 2 Web Server by Navule Pavan Kumar Rao.

Python Facebook messenger webhook with FastAPI on Glitch by Patrick Ladon.

Deploy a dockerized FastAPI application to AWS by Valon Januzaj.

FastAPI for Flask Users by Amit Chaudhary.

How to monitor your FastAPI service by Louis Guitton.

Creating a CRUD App with FastAPI (Part one) by Precious Ndubueze.

Build And Host Fast Data Science Applications Using FastAPI by Farhad Malik.

Deploy FastAPI on Azure App Service by Navule Pavan Kumar Rao.

Machine learning model serving in Python using FastAPI and streamlit by Davide Fiocco.

Introducing Dispatch by Netflix.

Using FastAPI with Django by Stavros Korokithakis.

Build a Secure Twilio Webhook with Python and FastAPI by Twilio.

Build a web API from scratch with FastAPI - the workshop by Sebastián Ramírez (tiangolo).

FastAPI + Zeit.co = 🚀 by Paul Sec.

Build simple API service with Python FastAPI — Part 1 by cuongld2.

Microservice in Python using FastAPI by Paurakh Sharma Humagain.

Real-time Notifications with Python and Postgres by Guillermo Cruz.

Create and Deploy FastAPI app to Heroku without using Docker by Navule Pavan Kumar Rao.

Another Boilerplate to FastAPI: Azure Pipeline CI + Pytest by Arthur Henrique.

Deploy Machine Learning Models with Keras, FastAPI, Redis and Docker by Shane Soh.

Towards Data Science: Deploying Iris Classifications with FastAPI and Docker by Mandy Gu.

TestDriven.io: Developing and Testing an Asynchronous API with FastAPI and Pytest by Michael Herman.

How To Deploy Tensorflow 2.0 Models As An API Service With FastAPI & Docker by Bernard Brenyah.

Why I'm Leaving Flask by Dylan Anthony.

Using Docker Compose to deploy a lightweight Python REST API with a job queue by Mike Moritz.

A FastAPI and Swagger UI visual cheatsheet by @euri10.

Uber: Ludwig v0.2 Adds New Features and Other Improvements to its Deep Learning Toolbox [including a FastAPI server] by Uber Engineering.

How to Deploy a Machine Learning Model by Maarten Grootendorst.

JWT Authentication with FastAPI and AWS Cognito by Johannes Gontrum.

Top 5 Asynchronous Web Frameworks for Python by Ankush Thakur.

Deploying a scikit-learn model with ONNX and FastAPI by Nico Axtmann.

FastAPI authentication revisited: Enabling API key authentication by Nils de Bruin.

FastAPI and Scikit-Learn: Easily Deploy Models by Nick Cortale.

Introduction to the fastapi python framework by Errieta Kostala.

FastAPI — How to add basic and cookie authentication by Nils de Bruin.

FastAPI — Google as an external authentication provider by Nils de Bruin.

FastAPI/Starlette debug vs prod by William Hayes.

Developing FastAPI Application using K8s & AWS by Mukul Mantosh.

Fastapi, Docker(Docker compose) and Postgres by KrishNa.

Deployment using Docker, Lambda, Aurora, CDK & GH Actions by Devon Ray.

Mastering Soft Delete: Advanced SQLAlchemy Techniques by Shubhendra Kushwaha.

Role based row filtering: Advanced SQLAlchemy Techniques by Shubhendra Kushwaha.

Domain-driven Design mit Python und FastAPI by Marcel Sander (actidoo).

Inbetriebnahme eines scikit-learn-Modells mit ONNX und FastAPI by Nico Axtmann.

REST-API Programmieren mittels Python und dem FastAPI Modul by Felix Schürmeyer.

[FastAPI] Python製のASGI Web フレームワーク FastAPIに入門する by @bee2.

PythonのWeb frameworkのパフォーマンス比較 (Django, Flask, responder, FastAPI, japronto) by @bee2.

【第4回】FastAPIチュートリアル: toDoアプリを作ってみよう【管理者ページ改良編】 by ライトコードメディア編集部.

【第3回】FastAPIチュートリアル: toDoアプリを作ってみよう【認証・ユーザ登録編】 by ライトコードメディア編集部.

【第2回】FastAPIチュートリアル: ToDoアプリを作ってみよう【モデル構築編】 by ライトコードメディア編集部.

【第1回】FastAPIチュートリアル: ToDoアプリを作ってみよう【環境構築編】 by ライトコードメディア編集部.

フロントエンド開発者向けのDockerによるPython開発環境構築 by Hikaru Takahashi.

FastAPIでPOSTされたJSONのレスポンスbodyを受け取る by @angel_katayoku.

FastAPIをMySQLと接続してDockerで管理してみる by @angel_katayoku.

FastAPIでCORSを回避 by @angel_katayoku.

python製の最新APIフレームワーク FastAPI を触ってみた by @ryoryomaru.

FastAPI｜DB接続してCRUDするPython製APIサーバーを構築 by @mtitg.

FastAPI do ZERO by Eduardo Mendes.

Dicas para migrar uma aplicação de Flask para FastAPI e vice-versa by Jessica Temporal.

FastAPI: знакомимся с фреймворком by Troy Köhler.

Почему Вы должны попробовать FastAPI? by prostomarkeloff.

Мелкая питонячая радость #2: Starlette - Солидная примочка – FastAPI by Andrey Korchak.

Starting With FastAPI and Examining Python's Import System - Episode 72 by Real Python.

Do you dare to press "."? - Episode 247 - Dan #6: SQLModel - use the same models for SQL and FastAPI by Python Bytes FM.

Build The Next Generation Of Python Web Applications With FastAPI - Episode 259 - interview to Sebastían Ramírez (tiangolo) by Podcast.__init__.

FastAPI on PythonBytes by Python Bytes FM.

PyCon AU 2023: Testing asynchronous applications with FastAPI and pytest by Jeny Sadadia.

[VIRTUAL] Py.Amsterdam's flying Software Circus: Intro to FastAPI by Sebastián Ramírez (tiangolo).

PyConBY 2020: Serve ML models easily with FastAPI by Sebastián Ramírez (tiangolo).

PyCon UK 2019: FastAPI from the ground up by Chris Withers.

Most starred GitHub repositories with the topic fastapi:

★ 38085 - full-stack-fastapi-template by @fastapi.

★ 32243 - Hello-Python by @mouredev.

★ 21754 - serve by @jina-ai.

★ 19400 - HivisionIDPhotos by @Zeyi-Lin.

★ 16859 - sqlmodel by @fastapi.

★ 14452 - Douyin_TikTok_Download_API by @Evil0ctal.

★ 13613 - fastapi-best-practices by @zhanymkanov.

★ 10624 - fastapi_mcp by @tadata-org.

★ 10415 - awesome-fastapi by @mjhea0.

★ 8879 - FastUI by @pydantic.

★ 8824 - XHS-Downloader by @JoeanAmier.

★ 8257 - SurfSense by @MODSetter.

★ 7367 - FileCodeBox by @vastsa.

★ 7291 - polar by @polarsource.

★ 7065 - nonebot2 by @nonebot.

★ 6070 - hatchet by @hatchet-dev.

★ 5754 - serge by @serge-chat.

★ 5599 - fastapi-users by @fastapi-users.

★ 4422 - strawberry by @strawberry-graphql.

★ 4301 - chatgpt-web-share by @chatpire.

★ 4197 - poem by @poem-web.

★ 4144 - dynaconf by @dynaconf.

★ 4094 - atrilabs-engine by @Atri-Labs.

★ 3739 - Kokoro-FastAPI by @remsky.

★ 3614 - logfire by @pydantic.

★ 3578 - LitServe by @Lightning-AI.

★ 3496 - datamodel-code-generator by @koxudaxi.

★ 3459 - farfalle by @rashadphz.

★ 3456 - fastapi-admin by @fastapi-admin.

★ 3447 - huma by @danielgtaylor.

★ 3254 - tracecat by @TracecatHQ.

★ 3134 - opyrator by @ml-tooling.

★ 3107 - docarray by @docarray.

★ 2936 - fastapi-realworld-example-app by @nsidnev.

★ 2804 - uvicorn-gunicorn-fastapi-docker by @tiangolo.

★ 2610 - best-of-web-python by @ml-tooling.

★ 2572 - mcp-context-forge by @IBM.

★ 2451 - fastapi-react by @Buuntu.

★ 2441 - RasaGPT by @paulpierre.

★ 2424 - FastAPI-template by @s3rius.

★ 2357 - sqladmin by @aminalaee.

★ 2324 - nextpy by @dot-agent.

★ 2236 - supabase-py by @supabase.

★ 2210 - 30-Days-of-Python by @codingforentrepreneurs.

★ 2171 - langserve by @langchain-ai.

★ 2164 - fastapi-utils by @fastapiutils.

★ 2102 - solara by @widgetti.

★ 1995 - Yuxi-Know by @xerrors.

★ 1989 - mangum by @Kludex.

★ 1816 - python-week-2022 by @rochacbruno.

★ 1789 - agentkit by @BCG-X-Official.

★ 1780 - manage-fastapi by @ycd.

★ 1777 - ormar by @collerek.

★ 1707 - openapi-python-client by @openapi-generators.

★ 1695 - piccolo by @piccolo-orm.

★ 1695 - vue-fastapi-admin by @mizhexiaoxiao.

★ 1653 - fastapi-cache by @long2ice.

★ 1635 - langchain-serve by @jina-ai.

★ 1624 - termpair by @cs01.

★ 1620 - slowapi by @laurentS.

★ 1576 - coronavirus-tracker-api by @ExpDev07.

★ 1546 - fastapi-crudrouter by @awtkns.

★ 1516 - FastAPI-boilerplate by @benavlabs.

★ 1481 - awesome-fastapi-projects by @Kludex.

★ 1453 - fastapi-pagination by @uriyyo.

★ 1415 - bracket by @evroon.

★ 1413 - awesome-python-resources by @DjangoEx.

★ 1406 - fastapi-boilerplate by @teamhide.

★ 1346 - budgetml by @ebhy.

★ 1342 - fastapi-amis-admin by @amisadmin.

★ 1334 - fastapi-langgraph-agent-production-ready-template by @wassim249.

★ 1303 - fastapi-tutorial by @liaogx.

★ 1276 - fastapi_best_architecture by @fastapi-practices.

★ 1272 - fastcrud by @benavlabs.

★ 1253 - fastapi-code-generator by @koxudaxi.

★ 1246 - prometheus-fastapi-instrumentator by @trallnag.

★ 1221 - bolt-python by @slackapi.

★ 1220 - bedrock-chat by @aws-samples.

★ 1202 - fastapi_production_template by @zhanymkanov.

★ 1193 - fastapi-scaff by @atpuxiner.

★ 1164 - langchain-extract by @langchain-ai.

★ 1149 - fastapi-alembic-sqlmodel-async by @jonra1993.

★ 1133 - odmantic by @art049.

★ 1122 - restish by @rest-sh.

★ 1047 - runhouse by @run-house.

★ 1027 - flock by @Onelevenvy.

★ 999 - authx by @yezz123.

★ 999 - autollm by @viddexa.

★ 995 - lanarky by @ajndkr.

★ 952 - titiler by @developmentseed.

★ 946 - energy-forecasting by @iusztinpaul.

★ 944 - secure by @TypeError.

★ 934 - langcorn by @msoedov.

★ 930 - RuoYi-Vue3-FastAPI by @insistence.

★ 916 - aktools by @akfamily.

★ 907 - every-pdf by @DDULDDUCK.

★ 903 - marker-api by @adithya-s-k.

★ 902 - fastapi-observability by @blueswen.

★ 900 - fastapi-do-zero by @dunossauro.

---

## FastAPI¶

**URL:** https://fastapi.tiangolo.com/

**Contents:**
- FastAPI¶
- Sponsors¶
- Opinions¶
- Typer, the FastAPI of CLIs¶
- Requirements¶
- Installation¶
- Example¶
  - Create it¶
  - Run it¶
  - Check it¶

FastAPI framework, high performance, easy to learn, fast to code, ready for production

Documentation: https://fastapi.tiangolo.com

Source Code: https://github.com/fastapi/fastapi

FastAPI is a modern, fast (high-performance), web framework for building APIs with Python based on standard Python type hints.

The key features are:

* estimation based on tests on an internal development team, building production applications.

"[...] I'm using FastAPI a ton these days. [...] I'm actually planning to use it for all of my team's ML services at Microsoft. Some of them are getting integrated into the core Windows product and some Office products."

"We adopted the FastAPI library to spawn a REST server that can be queried to obtain predictions. [for Ludwig]"

"Netflix is pleased to announce the open-source release of our crisis management orchestration framework: Dispatch! [built with FastAPI]"

"I’m over the moon excited about FastAPI. It’s so fun!"

"Honestly, what you've built looks super solid and polished. In many ways, it's what I wanted Hug to be - it's really inspiring to see someone build that."

"If you're looking to learn one modern framework for building REST APIs, check out FastAPI [...] It's fast, easy to use and easy to learn [...]"

"We've switched over to FastAPI for our APIs [...] I think you'll like it [...]"

"If anyone is looking to build a production Python API, I would highly recommend FastAPI. It is beautifully designed, simple to use and highly scalable, it has become a key component in our API first development strategy and is driving many automations and services such as our Virtual TAC Engineer."

If you are building a CLI app to be used in the terminal instead of a web API, check out Typer.

Typer is FastAPI's little sibling. And it's intended to be the FastAPI of CLIs. ⌨️ 🚀

FastAPI stands on the shoulders of giants:

Create and activate a virtual environment and then install FastAPI:

Note: Make sure you put "fastapi[standard]" in quotes to ensure it works in all terminals.

Create a file main.py with:

If your code uses async / await, use async def:

If you don't know, check the "In a hurry?" section about async and await in the docs.

The command fastapi dev reads your main.py file, detects the FastAPI app in it, and starts a server using Uvicorn.

By default, fastapi dev will start with auto-reload enabled for local development.

You can read more about it in the FastAPI CLI docs.

Open your browser at http://127.0.0.1:8000/items/5?q=somequery.

You will see the JSON response as:

You already created an API that:

Now go to http://127.0.0.1:8000/docs.

You will see the automatic interactive API documentation (provided by Swagger UI):

And now, go to http://127.0.0.1:8000/redoc.

You will see the alternative automatic documentation (provided by ReDoc):

Now modify the file main.py to receive a body from a PUT request.

Declare the body using standard Python types, thanks to Pydantic.

The fastapi dev server should reload automatically.

Now go to http://127.0.0.1:8000/docs.

And now, go to http://127.0.0.1:8000/redoc.

In summary, you declare once the types of parameters, body, etc. as function parameters.

You do that with standard modern Python types.

You don't have to learn a new syntax, the methods or classes of a specific library, etc.

Just standard Python.

For example, for an int:

or for a more complex Item model:

...and with that single declaration you get:

Coming back to the previous code example, FastAPI will:

We just scratched the surface, but you already get the idea of how it all works.

Try changing the line with:

...and see how your editor will auto-complete the attributes and know their types:

For a more complete example including more features, see the Tutorial - User Guide.

Spoiler alert: the tutorial - user guide includes:

Independent TechEmpower benchmarks show FastAPI applications running under Uvicorn as one of the fastest Python frameworks available, only below Starlette and Uvicorn themselves (used internally by FastAPI). (*)

To understand more about it, see the section Benchmarks.

FastAPI depends on Pydantic and Starlette.

When you install FastAPI with pip install "fastapi[standard]" it comes with the standard group of optional dependencies:

If you don't want to include the standard optional dependencies, you can install with pip install fastapi instead of pip install "fastapi[standard]".

If you want to install FastAPI with the standard dependencies but without the fastapi-cloud-cli, you can install with pip install "fastapi[standard-no-fastapi-cloud-cli]".

There are some additional dependencies you might want to install.

Additional optional Pydantic dependencies:

Additional optional FastAPI dependencies:

This project is licensed under the terms of the MIT license.

**Examples:**

Example 1 (unknown):
```unknown
$ pip install "fastapi[standard]"

---> 100%
```

Example 2 (python):
```python
from typing import Union

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
```

Example 3 (python):
```python
from typing import Union

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
async def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
```

Example 4 (unknown):
```unknown
$ fastapi dev main.py

 ╭────────── FastAPI CLI - Development mode ───────────╮
 │                                                     │
 │  Serving at: http://127.0.0.1:8000                  │
 │                                                     │
 │  API docs: http://127.0.0.1:8000/docs               │
 │                                                     │
 │  Running in development mode, for production use:   │
 │                                                     │
 │  fastapi run                                        │
 │                                                     │
 ╰─────────────────────────────────────────────────────╯

INFO:     Will watch for changes in these directories: ['/home/user/code/awesomeapp']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [2248755] using WatchFiles
INFO:     Started server process [2248757]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

---

## FastAPI and friends newsletter¶

**URL:** https://fastapi.tiangolo.com/newsletter/

**Contents:**
- FastAPI and friends newsletter¶

---

## FastAPI CLI¶

**URL:** https://fastapi.tiangolo.com/fastapi-cli/

**Contents:**
- FastAPI CLI¶
- fastapi dev¶
- fastapi run¶

FastAPI CLI is a command line program that you can use to serve your FastAPI app, manage your FastAPI project, and more.

When you install FastAPI (e.g. with pip install "fastapi[standard]"), it includes a package called fastapi-cli, this package provides the fastapi command in the terminal.

To run your FastAPI app for development, you can use the fastapi dev command:

The command line program called fastapi is FastAPI CLI.

FastAPI CLI takes the path to your Python program (e.g. main.py) and automatically detects the FastAPI instance (commonly named app), determines the correct import process, and then serves it.

For production you would use fastapi run instead. 🚀

Internally, FastAPI CLI uses Uvicorn, a high-performance, production-ready, ASGI server. 😎

Running fastapi dev initiates development mode.

By default, auto-reload is enabled, automatically reloading the server when you make changes to your code. This is resource-intensive and could be less stable than when it's disabled. You should only use it for development. It also listens on the IP address 127.0.0.1, which is the IP for your machine to communicate with itself alone (localhost).

Executing fastapi run starts FastAPI in production mode by default.

By default, auto-reload is disabled. It also listens on the IP address 0.0.0.0, which means all the available IP addresses, this way it will be publicly accessible to anyone that can communicate with the machine. This is how you would normally run it in production, for example, in a container.

In most cases you would (and should) have a "termination proxy" handling HTTPS for you on top, this will depend on how you deploy your application, your provider might do this for you, or you might need to set it up yourself.

You can learn more about it in the deployment documentation.

**Examples:**

Example 1 (python):
```python
$ <font color="#4E9A06">fastapi</font> dev <u style="text-decoration-style:solid">main.py</u>

  <span style="background-color:#009485"><font color="#D3D7CF"> FastAPI </font></span>  Starting development server 🚀

             Searching for package file structure from directories with
             <font color="#3465A4">__init__.py</font> files
             Importing from <font color="#75507B">/home/user/code/</font><font color="#AD7FA8">awesomeapp</font>

   <span style="background-color:#007166"><font color="#D3D7CF"> module </font></span>  🐍 main.py

     <span style="background-color:#007166"><font color="#D3D7CF"> code </font></span>  Importing the FastAPI app object from the module with the
             following code:

             <u style="text-decoration-style:solid">from </u><u style="text-decoration-style:solid"><b>main</b></u><u style="text-decoration-style:solid"> import </u><u style="text-decoration-style:solid"><b>app</b></u>

      <span style="background-color:#007166"><font color="#D3D7CF"> app </font></span>  Using import string: <font color="#3465A4">main:app</font>

   <span style="background-color:#007166"><font color="#D3D7CF"> server </font></span>  Server started at <font color="#729FCF"><u style="text-decoration-style:solid">http://127.0.0.1:8000</u></font>
   <span style="background-color:#007166"><font color="#D3D7CF"> server </font></span>  Documentation at <font color="#729FCF"><u style="text-decoration-style:solid">http://127.0.0.1:8000/docs</u></font>

      <span style="background-color:#007166"><font color="#D3D7CF"> tip </font></span>  Running in development mode, for production use:
             <b>fastapi run</b>

             Logs:

     <span style="background-color:#007166"><font color="#D3D7CF"> INFO </font></span>  Will watch for changes in these directories:
             <b>[</b><font color="#4E9A06">&apos;/home/user/code/awesomeapp&apos;</font><b>]</b>
     <span style="background-color:#007166"><font color="#D3D7CF"> INFO </font></span>  Uvicorn running on <font color="#729FCF"><u style="text-decoration-style:solid">http://127.0.0.1:8000</u></font> <b>(</b>Press CTRL+C to
             quit<b>)</b>
     <span style="background-color:#007166"><font color="#D3D7CF"> INFO </font></span>  Started reloader process <b>[</b><font color="#34E2E2"><b>383138</b></font><b>]</b> using WatchFiles
     <span style="background-color:#007166"><font color="#D3D7CF"> INFO </font></span>  Started server process <b>[</b><font color="#34E2E2"><b>383153</b></font><b>]</b>
     <span style="background-color:#007166"><font color="#D3D7CF"> INFO </font></span>  Waiting for application startup.
     <span style="background-color:#007166"><font color="#D3D7CF"> INFO </font></span>  Application startup complete.
```

---

## FastAPI¶

**URL:** https://fastapi.tiangolo.com/ja/

**Contents:**
- FastAPI¶
- Sponsors¶
- 評価¶
- Typer, the FastAPI of CLIs¶
- 必要条件¶
- インストール¶
- アプリケーション例¶
  - アプリケーションの作成¶
  - 実行¶
  - 動作確認¶

FastAPI framework, high performance, easy to learn, fast to code, ready for production

ドキュメント: https://fastapi.tiangolo.com

ソースコード: https://github.com/fastapi/fastapi

FastAPI は、Pythonの標準である型ヒントに基づいてPython 以降でAPI を構築するための、モダンで、高速(高パフォーマンス)な、Web フレームワークです。

高速: NodeJS や Go 並みのとても高いパフォーマンス (Starlette と Pydantic のおかげです)。 最も高速な Python フレームワークの一つです.

高速なコーディング: 開発速度を約 200%~300%向上させます。 *

* 本番アプリケーションを構築している開発チームのテストによる見積もり。

"[...] 最近 FastAPI を使っています。 [...] 実際に私のチームの全ての Microsoft の機械学習サービス で使用する予定です。 そのうちのいくつかのコアなWindows製品とOffice製品に統合されつつあります。"

"FastAPIライブラリを採用し、クエリで予測値を取得できるRESTサーバを構築しました。 [for Ludwig]"

"Netflix は、危機管理オーケストレーションフレームワーク、Dispatchのオープンソースリリースを発表できることをうれしく思います。 [built with FastAPI]"

"私はFastAPIにワクワクしています。 めちゃくちゃ楽しいです！"

"正直、超堅実で洗練されているように見えます。いろんな意味で、それは私がハグしたかったものです。"

"REST API を構築するためのモダンなフレームワークを学びたい方は、FastAPI [...] をチェックしてみてください。 [...] 高速で, 使用、習得が簡単です。[...]"

"私たちのAPIはFastAPIに切り替えました。[...] きっと気に入ると思います。 [...]"

もし Web API の代わりにターミナルで使用するCLIアプリを構築する場合は、Typerを確認してください。

Typerは FastAPI の弟分です。そして、CLI 版 の FastAPIを意味しています。

FastAPI は巨人の肩の上に立っています。

本番環境では、Uvicorn または、 Hypercornのような、 ASGI サーバーが必要になります。

async / awaitを使用するときは、 async defを使います:

わからない場合は、ドキュメントのasync と awaitにある"In a hurry?"セクションをチェックしてください。

uvicorn main:appコマンドは以下の項目を参照します:

ブラウザからhttp://127.0.0.1:8000/items/5?q=somequeryを開きます。

以下の JSON のレスポンスが確認できます:

もうすでに以下の API が作成されています:

http://127.0.0.1:8000/docsにアクセスしてみてください。

自動対話型の API ドキュメントが表示されます。 (Swagger UIが提供しています。):

http://127.0.0.1:8000/redocにアクセスしてみてください。

代替の自動ドキュメントが表示されます。(ReDocが提供しています。):

PUTリクエストからボディを受け取るためにmain.pyを修正しましょう。

Pydantic によって、Python の標準的な型を使ってボディを宣言します。

サーバーは自動でリロードされます。(上述のuvicornコマンドで--reloadオプションを追加しているからです。)

http://127.0.0.1:8000/docsにアクセスしましょう。

http://127.0.0.1:8000/redocにアクセスしましょう。

要約すると、関数のパラメータとして、パラメータやボディ などの型を一度だけ宣言します。

標準的な最新の Python の型を使っています。

新しい構文や特定のライブラリのメソッドやクラスなどを覚える必要はありません。

単なる標準的な3.8 以降の Pythonです。

...そして、この一度の宣言で、以下のようになります:

コード例に戻りましょう、FastAPI は次のようになります:

まだ表面的な部分に触れただけですが、もう全ての仕組みは分かっているはずです。

...そして、エディタが属性を自動補完し、そのタイプを知る方法を確認してください。:

より多くの機能を含む、より完全な例については、チュートリアル - ユーザーガイドをご覧ください。

ネタバレ注意: チュートリアル - ユーザーガイドは以下の情報が含まれています:

独立した TechEmpower のベンチマークでは、Uvicorn で動作するFastAPIアプリケーションが、Python フレームワークの中で最も高速なものの 1 つであり、Starlette と Uvicorn（FastAPI で内部的に使用されています）にのみ下回っていると示されています。

詳細はベンチマークセクションをご覧ください。

Pydantic によって使用されるもの:

Starlette によって使用されるもの:

FastAPI / Starlette に使用されるもの:

これらは全て pip install fastapi[all]でインストールできます。

このプロジェクトは MIT ライセンスです。

**Examples:**

Example 1 (unknown):
```unknown
$ pip install fastapi

---> 100%
```

Example 2 (unknown):
```unknown
$ pip install "uvicorn[standard]"

---> 100%
```

Example 3 (python):
```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}
```

Example 4 (python):
```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
async def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}
```

---

## FastAPI People¶

**URL:** https://fastapi.tiangolo.com/fastapi-people/

**Contents:**
- FastAPI People¶
- Creator¶
- Team¶
- FastAPI Experts¶
  - FastAPI Experts - Last Month¶
  - FastAPI Experts - 3 Months¶
  - FastAPI Experts - 6 Months¶
  - FastAPI Experts - 1 Year¶
  - FastAPI Experts - All Time¶
- Top Contributors¶

FastAPI has an amazing community that welcomes people from all backgrounds.

I'm the creator of FastAPI. You can read more about that in Help FastAPI - Get Help - Connect with the author.

...But here I want to show you the community.

FastAPI receives a lot of support from the community. And I want to highlight their contributions.

These are the people that:

All these tasks help maintain the repository.

A round of applause to them. 👏 🙇

This is the current list of team members. 😎

They have different levels of involvement and permissions, they can perform repository management tasks and together we manage the FastAPI repository.

Although the team members have the permissions to perform privileged tasks, all the help from others maintaining FastAPI is very much appreciated! 🙇‍♂️

These are the users that have been helping others the most with questions in GitHub. 🙇

They have proven to be FastAPI Experts by helping many others. ✨

You could become an official FastAPI Expert too!

Just help others with questions in GitHub. 🤓

You can see the FastAPI Experts for:

These are the users that have been helping others the most with questions in GitHub during the last month. 🤓

These are the users that have been helping others the most with questions in GitHub during the last 3 months. 😎

These are the users that have been helping others the most with questions in GitHub during the last 6 months. 🧐

These are the users that have been helping others the most with questions in GitHub during the last year. 🧑‍🔬

Here are the all time FastAPI Experts. 🤓🤯

These are the users that have helped others the most with questions in GitHub through all time. 🧙

Here are the Top Contributors. 👷

These users have created the most Pull Requests that have been merged.

They have contributed source code, documentation, etc. 📦

There are hundreds of other contributors, you can see them all in the FastAPI GitHub Contributors page. 👷

These are the Top Translators. 🌐

These users have created the most Pull Requests with translations to other languages that have been merged.

These users are the Top Translation Reviewers. 🕵️

I only speak a few languages (and not very well 😅). So, the reviewers are the ones that have the power to approve translations of the documentation. Without them, there wouldn't be documentation in several other languages.

These are the Sponsors. 😎

They are supporting my work with FastAPI (and others), mainly through GitHub Sponsors.

The main intention of this page is to highlight the effort of the community to help others.

Especially including efforts that are normally less visible, and in many cases more arduous, like helping others with questions and reviewing Pull Requests with translations.

The data is calculated each month, you can read the source code here.

Here I'm also highlighting contributions from sponsors.

I also reserve the right to update the algorithm, sections, thresholds, etc (just in case 🤷).

---

## Features¶

**URL:** https://fastapi.tiangolo.com/features/

**Contents:**
- Features¶
- FastAPI features¶
  - Based on open standards¶
  - Automatic docs¶
  - Just Modern Python¶
  - Editor support¶
  - Short¶
  - Validation¶
  - Security and authentication¶
  - Dependency Injection¶

FastAPI gives you the following:

Interactive API documentation and exploration web user interfaces. As the framework is based on OpenAPI, there are multiple options, 2 included by default.

It's all based on standard Python type declarations (thanks to Pydantic). No new syntax to learn. Just standard modern Python.

If you need a 2 minute refresher of how to use Python types (even if you don't use FastAPI), check the short tutorial: Python Types.

You write standard Python with types:

That can then be used like:

**second_user_data means:

Pass the keys and values of the second_user_data dict directly as key-value arguments, equivalent to: User(id=4, name="Mary", joined="2018-11-30")

All the framework was designed to be easy and intuitive to use, all the decisions were tested on multiple editors even before starting development, to ensure the best development experience.

In the Python developer surveys, it's clear that one of the most used features is "autocompletion".

The whole FastAPI framework is based to satisfy that. Autocompletion works everywhere.

You will rarely need to come back to the docs.

Here's how your editor might help you:

You will get completion in code you might even consider impossible before. As for example, the price key inside a JSON body (that could have been nested) that comes from a request.

No more typing the wrong key names, coming back and forth between docs, or scrolling up and down to find if you finally used username or user_name.

It has sensible defaults for everything, with optional configurations everywhere. All the parameters can be fine-tuned to do what you need and to define the API you need.

But by default, it all "just works".

Validation for most (or all?) Python data types, including:

Validation for more exotic types, like:

All the validation is handled by the well-established and robust Pydantic.

Security and authentication integrated. Without any compromise with databases or data models.

All the security schemes defined in OpenAPI, including:

Plus all the security features from Starlette (including session cookies).

All built as reusable tools and components that are easy to integrate with your systems, data stores, relational and NoSQL databases, etc.

FastAPI includes an extremely easy to use, but extremely powerful Dependency Injection system.

Or in other way, no need for them, import and use the code you need.

Any integration is designed to be so simple to use (with dependencies) that you can create a "plug-in" for your application in 2 lines of code using the same structure and syntax used for your path operations.

FastAPI is fully compatible with (and based on) Starlette. So, any additional Starlette code you have, will also work.

FastAPI is actually a sub-class of Starlette. So, if you already know or use Starlette, most of the functionality will work the same way.

With FastAPI you get all of Starlette's features (as FastAPI is just Starlette on steroids):

FastAPI is fully compatible with (and based on) Pydantic. So, any additional Pydantic code you have, will also work.

Including external libraries also based on Pydantic, as ORMs, ODMs for databases.

This also means that in many cases you can pass the same object you get from a request directly to the database, as everything is validated automatically.

The same applies the other way around, in many cases you can just pass the object you get from the database directly to the client.

With FastAPI you get all of Pydantic's features (as FastAPI is based on Pydantic for all the data handling):

**Examples:**

Example 1 (python):
```python
from datetime import date

from pydantic import BaseModel

# Declare a variable as a str
# and get editor support inside the function
def main(user_id: str):
    return user_id


# A Pydantic model
class User(BaseModel):
    id: int
    name: str
    joined: date
```

Example 2 (unknown):
```unknown
my_user: User = User(id=3, name="John Doe", joined="2018-07-19")

second_user_data = {
    "id": 4,
    "name": "Mary",
    "joined": "2018-11-30",
}

my_second_user: User = User(**second_user_data)
```

---

## Help FastAPI - Get Help¶

**URL:** https://fastapi.tiangolo.com/help-fastapi/

**Contents:**
- Help FastAPI - Get Help¶
- Subscribe to the newsletter¶
- Follow FastAPI on X (Twitter)¶
- Star FastAPI in GitHub¶
- Watch the GitHub repository for releases¶
- Connect with the author¶
- Tweet about FastAPI¶
- Vote for FastAPI¶
- Help others with questions in GitHub¶
  - Understand the question¶

Would you like to help FastAPI, other users, and the author?

Or would you like to get help with FastAPI?

There are very simple ways to help (several involve just one or two clicks).

And there are several ways to get help too.

You can subscribe to the (infrequent) FastAPI and friends newsletter to stay updated about:

Follow @fastapi on X (Twitter) to get the latest news about FastAPI. 🐦

You can "star" FastAPI in GitHub (clicking the star button at the top right): https://github.com/fastapi/fastapi. ⭐️

By adding a star, other users will be able to find it more easily and see that it has been already useful for others.

You can "watch" FastAPI in GitHub (clicking the "watch" button at the top right): https://github.com/fastapi/fastapi. 👀

There you can select "Releases only".

By doing it, you will receive notifications (in your email) whenever there's a new release (a new version) of FastAPI with bug fixes and new features.

You can connect with me (Sebastián Ramírez / tiangolo), the author.

Tweet about FastAPI and let me and others know why you like it. 🎉

I love to hear about how FastAPI is being used, what you have liked in it, in which project/company are you using it, etc.

You can try and help others with their questions in:

In many cases you might already know the answer for those questions. 🤓

If you are helping a lot of people with their questions, you will become an official FastAPI Expert. 🎉

Just remember, the most important point is: try to be kind. People come with their frustrations and in many cases don't ask in the best way, but try as best as you can to be kind. 🤗

The idea is for the FastAPI community to be kind and welcoming. At the same time, don't accept bullying or disrespectful behavior towards others. We have to take care of each other.

Here's how to help others with questions (in discussions or issues):

Check if you can understand what is the purpose and use case of the person asking.

Then check if the question (the vast majority are questions) is clear.

In many cases the question asked is about an imaginary solution from the user, but there might be a better one. If you can understand the problem and use case better, you might be able to suggest a better alternative solution.

If you can't understand the question, ask for more details.

For most of the cases and most of the questions there's something related to the person's original code.

In many cases they will only copy a fragment of the code, but that's not enough to reproduce the problem.

You can ask them to provide a minimal, reproducible, example, that you can copy-paste and run locally to see the same error or behavior they are seeing, or to understand their use case better.

If you are feeling too generous, you can try to create an example like that yourself, just based on the description of the problem. Just keep in mind that this might take a lot of time and it might be better to ask them to clarify the problem first.

After being able to understand the question, you can give them a possible answer.

In many cases, it's better to understand their underlying problem or use case, because there might be a better way to solve it than what they are trying to do.

If they reply, there's a high chance you would have solved their problem, congrats, you're a hero! 🦸

Now, if that solved their problem, you can ask them to:

You can "watch" FastAPI in GitHub (clicking the "watch" button at the top right): https://github.com/fastapi/fastapi. 👀

If you select "Watching" instead of "Releases only" you will receive notifications when someone creates a new issue or question. You can also specify that you only want to be notified about new issues, or discussions, or PRs, etc.

Then you can try and help them solve those questions.

You can create a new question in the GitHub repository, for example to:

Note: if you do it, then I'm going to ask you to also help others. 😉

You can help me review pull requests from others.

Again, please try your best to be kind. 🤗

Here's what to keep in mind and how to review a pull request:

First, make sure you understand the problem that the pull request is trying to solve. It might have a longer discussion in a GitHub Discussion or issue.

There's also a good chance that the pull request is not actually needed because the problem can be solved in a different way. Then you can suggest or ask about that.

Don't worry too much about things like commit message styles, I will squash and merge customizing the commit manually.

Also don't worry about style rules, there are already automatized tools checking that.

And if there's any other style or consistency need, I'll ask directly for that, or I'll add commits on top with the needed changes.

Check and read the code, see if it makes sense, run it locally and see if it actually solves the problem.

Then comment saying that you did that, that's how I will know you really checked it.

Unfortunately, I can't simply trust PRs that just have several approvals.

Several times it has happened that there are PRs with 3, 5 or more approvals, probably because the description is appealing, but when I check the PRs, they are actually broken, have a bug, or don't solve the problem they claim to solve. 😅

So, it's really important that you actually read and run the code, and let me know in the comments that you did. 🤓

Help me check that the PR has tests.

Check that the tests fail before the PR. 🚨

Then check that the tests pass after the PR. ✅

Many PRs don't have tests, you can remind them to add tests, or you can even suggest some tests yourself. That's one of the things that consume most time and you can help a lot with that.

Then also comment what you tried, that way I'll know that you checked it. 🤓

You can contribute to the source code with Pull Requests, for example:

Help me maintain FastAPI! 🤓

There's a lot of work to do, and for most of it, YOU can do it.

The main tasks that you can do right now are:

Those two tasks are what consume time the most. That's the main work of maintaining FastAPI.

If you can help me with that, you are helping me maintain FastAPI and making sure it keeps advancing faster and better. 🚀

Join the 👥 Discord chat server 👥 and hang out with others in the FastAPI community.

For questions, ask them in GitHub Discussions, there's a much better chance you will receive help by the FastAPI Experts.

Use the chat only for other general conversations.

Keep in mind that as chats allow more "free conversation", it's easy to ask questions that are too general and more difficult to answer, so, you might not receive answers.

In GitHub, the template will guide you to write the right question so that you can more easily get a good answer, or even solve the problem yourself even before asking. And in GitHub I can make sure I always answer everything, even if it takes some time. I can't personally do that with the chat systems. 😅

Conversations in the chat systems are also not as easily searchable as in GitHub, so questions and answers might get lost in the conversation. And only the ones in GitHub count to become a FastAPI Expert, so you will most probably receive more attention in GitHub.

On the other side, there are thousands of users in the chat systems, so there's a high chance you'll find someone to talk to there, almost all the time. 😄

If your product/company depends on or is related to FastAPI and you want to reach its users, you can sponsor the author (me) through GitHub sponsors. Depending on the tier, you could get some extra benefits, like a badge in the docs. 🎁

---

## Migrate from Pydantic v1 to Pydantic v2¶

**URL:** https://fastapi.tiangolo.com/how-to/migrate-from-pydantic-v1-to-pydantic-v2/

**Contents:**
- Migrate from Pydantic v1 to Pydantic v2¶
- Official Guide¶
- Tests¶
- bump-pydantic¶
- Pydantic v1 in v2¶
  - FastAPI support for Pydantic v1 in v2¶
  - Pydantic v1 and v2 on the same app¶
  - Pydantic v1 parameters¶
  - Migrate in steps¶

If you have an old FastAPI app, you might be using Pydantic version 1.

FastAPI has had support for either Pydantic v1 or v2 since version 0.100.0.

If you had installed Pydantic v2, it would use it. If instead you had Pydantic v1, it would use that.

Pydantic v1 is now deprecated and support for it will be removed in the next versions of FastAPI, you should migrate to Pydantic v2. This way you will get the latest features, improvements, and fixes.

Also, the Pydantic team stopped support for Pydantic v1 for the latest versions of Python, starting with Python 3.14.

If you want to use the latest features of Python, you will need to make sure you use Pydantic v2.

If you have an old FastAPI app with Pydantic v1, here I'll show you how to migrate it to Pydantic v2, and the new features in FastAPI 0.119.0 to help you with a gradual migration.

Pydantic has an official Migration Guide from v1 to v2.

It also includes what has changed, how validations are now more correct and strict, possible caveats, etc.

You can read it to understand better what has changed.

Make sure you have tests for your app and you run them on continuous integration (CI).

This way, you can do the upgrade and make sure everything is still working as expected.

In many cases, when you use regular Pydantic models without customizations, you will be able to automate most of the process of migrating from Pydantic v1 to Pydantic v2.

You can use bump-pydantic from the same Pydantic team.

This tool will help you to automatically change most of the code that needs to be changed.

After this, you can run the tests and check if everything works. If it does, you are done. 😎

Pydantic v2 includes everything from Pydantic v1 as a submodule pydantic.v1.

This means that you can install the latest version of Pydantic v2 and import and use the old Pydantic v1 components from this submodule, as if you had the old Pydantic v1 installed.

Since FastAPI 0.119.0, there's also partial support for Pydantic v1 from inside of Pydantic v2, to facilitate the migration to v2.

So, you could upgrade Pydantic to the latest version 2, and change the imports to use the pydantic.v1 submodule, and in many cases it would just work.

Have in mind that as the Pydantic team no longer supports Pydantic v1 in recent versions of Python, starting from Python 3.14, using pydantic.v1 is also not supported in Python 3.14 and above.

It's not supported by Pydantic to have a model of Pydantic v2 with its own fields defined as Pydantic v1 models or vice versa.

...but, you can have separated models using Pydantic v1 and v2 in the same app.

In some cases, it's even possible to have both Pydantic v1 and v2 models in the same path operation in your FastAPI app:

In this example above, the input model is a Pydantic v1 model, and the output model (defined in response_model=ItemV2) is a Pydantic v2 model.

If you need to use some of the FastAPI-specific tools for parameters like Body, Query, Form, etc. with Pydantic v1 models, you can import them from fastapi.temp_pydantic_v1_params while you finish the migration to Pydantic v2:

First try with bump-pydantic, if your tests pass and that works, then you're done in one command. ✨

If bump-pydantic doesn't work for your use case, you can use the support for both Pydantic v1 and v2 models in the same app to do the migration to Pydantic v2 gradually.

You could fist upgrade Pydantic to use the latest version 2, and change the imports to use pydantic.v1 for all your models.

Then, you can start migrating your models from Pydantic v1 to v2 in groups, in gradual steps. 🚶

**Examples:**

Example 1 (python):
```python
from pydantic.v1 import BaseModel


class Item(BaseModel):
    name: str
    description: str | None = None
    size: float
```

Example 2 (python):
```python
from typing import Union

from pydantic.v1 import BaseModel


class Item(BaseModel):
    name: str
    description: Union[str, None] = None
    size: float
```

Example 3 (python):
```python
from fastapi import FastAPI
from pydantic.v1 import BaseModel


class Item(BaseModel):
    name: str
    description: str | None = None
    size: float


app = FastAPI()


@app.post("/items/")
async def create_item(item: Item) -> Item:
    return item
```

Example 4 (python):
```python
from typing import Union

from fastapi import FastAPI
from pydantic.v1 import BaseModel


class Item(BaseModel):
    name: str
    description: Union[str, None] = None
    size: float


app = FastAPI()


@app.post("/items/")
async def create_item(item: Item) -> Item:
    return item
```

---

## Python Types Intro¶

**URL:** https://fastapi.tiangolo.com/python-types/

**Contents:**
- Python Types Intro¶
- Motivation¶
  - Edit it¶
  - Add types¶
- More motivation¶
- Declaring types¶
  - Simple types¶
  - Generic types with type parameters¶
    - Newer versions of Python¶
    - List¶

Python has support for optional "type hints" (also called "type annotations").

These "type hints" or annotations are a special syntax that allow declaring the type of a variable.

By declaring types for your variables, editors and tools can give you better support.

This is just a quick tutorial / refresher about Python type hints. It covers only the minimum necessary to use them with FastAPI... which is actually very little.

FastAPI is all based on these type hints, they give it many advantages and benefits.

But even if you never use FastAPI, you would benefit from learning a bit about them.

If you are a Python expert, and you already know everything about type hints, skip to the next chapter.

Let's start with a simple example:

Calling this program outputs:

The function does the following:

It's a very simple program.

But now imagine that you were writing it from scratch.

At some point you would have started the definition of the function, you had the parameters ready...

But then you have to call "that method that converts the first letter to upper case".

Was it upper? Was it uppercase? first_uppercase? capitalize?

Then, you try with the old programmer's friend, editor autocompletion.

You type the first parameter of the function, first_name, then a dot (.) and then hit Ctrl+Space to trigger the completion.

But, sadly, you get nothing useful:

Let's modify a single line from the previous version.

We will change exactly this fragment, the parameters of the function, from:

Those are the "type hints":

That is not the same as declaring default values like would be with:

It's a different thing.

We are using colons (:), not equals (=).

And adding type hints normally doesn't change what happens from what would happen without them.

But now, imagine you are again in the middle of creating that function, but with type hints.

At the same point, you try to trigger the autocomplete with Ctrl+Space and you see:

With that, you can scroll, seeing the options, until you find the one that "rings a bell":

Check this function, it already has type hints:

Because the editor knows the types of the variables, you don't only get completion, you also get error checks:

Now you know that you have to fix it, convert age to a string with str(age):

You just saw the main place to declare type hints. As function parameters.

This is also the main place you would use them with FastAPI.

You can declare all the standard Python types, not only str.

You can use, for example:

There are some data structures that can contain other values, like dict, list, set and tuple. And the internal values can have their own type too.

These types that have internal types are called "generic" types. And it's possible to declare them, even with their internal types.

To declare those types and the internal types, you can use the standard Python module typing. It exists specifically to support these type hints.

The syntax using typing is compatible with all versions, from Python 3.6 to the latest ones, including Python 3.9, Python 3.10, etc.

As Python advances, newer versions come with improved support for these type annotations and in many cases you won't even need to import and use the typing module to declare the type annotations.

If you can choose a more recent version of Python for your project, you will be able to take advantage of that extra simplicity.

In all the docs there are examples compatible with each version of Python (when there's a difference).

For example "Python 3.6+" means it's compatible with Python 3.6 or above (including 3.7, 3.8, 3.9, 3.10, etc). And "Python 3.9+" means it's compatible with Python 3.9 or above (including 3.10, etc).

If you can use the latest versions of Python, use the examples for the latest version, those will have the best and simplest syntax, for example, "Python 3.10+".

For example, let's define a variable to be a list of str.

Declare the variable, with the same colon (:) syntax.

As the type, put list.

As the list is a type that contains some internal types, you put them in square brackets:

From typing, import List (with a capital L):

Declare the variable, with the same colon (:) syntax.

As the type, put the List that you imported from typing.

As the list is a type that contains some internal types, you put them in square brackets:

Those internal types in the square brackets are called "type parameters".

In this case, str is the type parameter passed to List (or list in Python 3.9 and above).

That means: "the variable items is a list, and each of the items in this list is a str".

If you use Python 3.9 or above, you don't have to import List from typing, you can use the same regular list type instead.

By doing that, your editor can provide support even while processing items from the list:

Without types, that's almost impossible to achieve.

Notice that the variable item is one of the elements in the list items.

And still, the editor knows it is a str, and provides support for that.

You would do the same to declare tuples and sets:

To define a dict, you pass 2 type parameters, separated by commas.

The first type parameter is for the keys of the dict.

The second type parameter is for the values of the dict:

You can declare that a variable can be any of several types, for example, an int or a str.

In Python 3.6 and above (including Python 3.10) you can use the Union type from typing and put inside the square brackets the possible types to accept.

In Python 3.10 there's also a new syntax where you can put the possible types separated by a vertical bar (|).

In both cases this means that item could be an int or a str.

You can declare that a value could have a type, like str, but that it could also be None.

In Python 3.6 and above (including Python 3.10) you can declare it by importing and using Optional from the typing module.

Using Optional[str] instead of just str will let the editor help you detect errors where you could be assuming that a value is always a str, when it could actually be None too.

Optional[Something] is actually a shortcut for Union[Something, None], they are equivalent.

This also means that in Python 3.10, you can use Something | None:

If you are using a Python version below 3.10, here's a tip from my very subjective point of view:

Both are equivalent and underneath they are the same, but I would recommend Union instead of Optional because the word "optional" would seem to imply that the value is optional, and it actually means "it can be None", even if it's not optional and is still required.

I think Union[SomeType, None] is more explicit about what it means.

It's just about the words and names. But those words can affect how you and your teammates think about the code.

As an example, let's take this function:

The parameter name is defined as Optional[str], but it is not optional, you cannot call the function without the parameter:

The name parameter is still required (not optional) because it doesn't have a default value. Still, name accepts None as the value:

The good news is, once you are on Python 3.10 you won't have to worry about that, as you will be able to simply use | to define unions of types:

And then you won't have to worry about names like Optional and Union. 😎

These types that take type parameters in square brackets are called Generic types or Generics, for example:

You can use the same builtin types as generics (with square brackets and types inside):

And the same as with Python 3.8, from the typing module:

In Python 3.10, as an alternative to using the generics Union and Optional, you can use the vertical bar (|) to declare unions of types, that's a lot better and simpler.

You can use the same builtin types as generics (with square brackets and types inside):

And the same as with Python 3.8, from the typing module:

You can also declare a class as the type of a variable.

Let's say you have a class Person, with a name:

Then you can declare a variable to be of type Person:

And then, again, you get all the editor support:

Notice that this means "one_person is an instance of the class Person".

It doesn't mean "one_person is the class called Person".

Pydantic is a Python library to perform data validation.

You declare the "shape" of the data as classes with attributes.

And each attribute has a type.

Then you create an instance of that class with some values and it will validate the values, convert them to the appropriate type (if that's the case) and give you an object with all the data.

And you get all the editor support with that resulting object.

An example from the official Pydantic docs:

To learn more about Pydantic, check its docs.

FastAPI is all based on Pydantic.

You will see a lot more of all this in practice in the Tutorial - User Guide.

Pydantic has a special behavior when you use Optional or Union[Something, None] without a default value, you can read more about it in the Pydantic docs about Required Optional fields.

Python also has a feature that allows putting additional metadata in these type hints using Annotated.

In Python 3.9, Annotated is part of the standard library, so you can import it from typing.

In versions below Python 3.9, you import Annotated from typing_extensions.

It will already be installed with FastAPI.

Python itself doesn't do anything with this Annotated. And for editors and other tools, the type is still str.

But you can use this space in Annotated to provide FastAPI with additional metadata about how you want your application to behave.

The important thing to remember is that the first type parameter you pass to Annotated is the actual type. The rest, is just metadata for other tools.

For now, you just need to know that Annotated exists, and that it's standard Python. 😎

Later you will see how powerful it can be.

The fact that this is standard Python means that you will still get the best possible developer experience in your editor, with the tools you use to analyze and refactor your code, etc. ✨

And also that your code will be very compatible with many other Python tools and libraries. 🚀

FastAPI takes advantage of these type hints to do several things.

With FastAPI you declare parameters with type hints and you get:

...and FastAPI uses the same declarations to:

This might all sound abstract. Don't worry. You'll see all this in action in the Tutorial - User Guide.

The important thing is that by using standard Python types, in a single place (instead of adding more classes, decorators, etc), FastAPI will do a lot of the work for you.

If you already went through all the tutorial and came back to see more about types, a good resource is the "cheat sheet" from mypy.

**Examples:**

Example 1 (python):
```python
def get_full_name(first_name, last_name):
    full_name = first_name.title() + " " + last_name.title()
    return full_name


print(get_full_name("john", "doe"))
```

Example 2 (python):
```python
def get_full_name(first_name, last_name):
    full_name = first_name.title() + " " + last_name.title()
    return full_name


print(get_full_name("john", "doe"))
```

Example 3 (unknown):
```unknown
first_name, last_name
```

Example 4 (unknown):
```unknown
first_name: str, last_name: str
```

---

## Reference¶

**URL:** https://fastapi.tiangolo.com/reference/

**Contents:**
- Reference¶

Here's the reference or code API, the classes, functions, parameters, attributes, and all the FastAPI parts you can use in your applications.

If you want to learn FastAPI you are much better off reading the FastAPI Tutorial.

---

## Release Notes¶

**URL:** https://fastapi.tiangolo.com/release-notes/

**Contents:**
- Release Notes¶
- Latest Changes¶
- 0.120.4¶
  - Fixes¶
- 0.120.3¶
  - Refactors¶
  - Docs¶
- 0.120.2¶
  - Fixes¶
  - Internal¶

There are no major nor breaking changes in this release. ☕️

The internal reference documentation now uses annotated_doc.Doc instead of typing_extensions.Doc, this adds a new (very small) dependency on annotated-doc, a package made just to provide that Doc documentation utility class.

I would expect typing_extensions.Doc to be deprecated and then removed at some point from typing_extensions, for that reason there's the new annotated-doc micro-package. If you are curious about this, you can read more in the repo for annotated-doc.

This new version 0.120.0 only contains that transition to the new home package for that utility class Doc.

FastAPI now (temporarily) supports both Pydantic v2 models and pydantic.v1 models at the same time in the same app, to make it easier for any FastAPI apps still using Pydantic v1 to gradually but quickly migrate to Pydantic v2.

Adding this feature was a big effort with the main objective of making it easier for the few applications still stuck in Pydantic v1 to migrate to Pydantic v2.

And with this, support for Pydantic v1 is now deprecated and will be removed from FastAPI in a future version soon.

Note: have in mind that the Pydantic team already stopped supporting Pydantic v1 for recent versions of Python, starting with Python 3.14.

You can read in the docs more about how to Migrate from Pydantic v1 to Pydantic v2.

Before FastAPI 0.118.0, if you used a dependency with yield, it would run the exit code after the path operation function returned but right before sending the response.

This change also meant that if you returned a StreamingResponse, the exit code of the dependency with yield would have been already run.

For example, if you had a database session in a dependency with yield, the StreamingResponse would not be able to use that session while streaming data because the session would have already been closed in the exit code after yield.

This behavior was reverted in 0.118.0, to make the exit code after yield be executed after the response is sent.

You can read more about it in the docs for Advanced Dependencies - Dependencies with yield, HTTPException, except and Background Tasks. Including what you could do if you wanted to close a database session earlier, before returning the response to the client.

Installing fastapi[standard] now includes fastapi-cloud-cli.

This will allow you to deploy to FastAPI Cloud with the fastapi deploy command.

If you want to install fastapi with the standard dependencies but without fastapi-cloud-cli, you can install instead fastapi[standard-no-fastapi-cloud-cli].

Now you can declare Query, Header, and Cookie parameters with Pydantic models. 🎉

Use Pydantic models for Query parameters:

Read the new docs: Query Parameter Models.

Use Pydantic models for Header parameters:

Read the new docs: Header Parameter Models.

Use Pydantic models for Cookie parameters:

Read the new docs: Cookie Parameter Models.

Use Pydantic models to restrict extra values for Query parameters (also applies to Header and Cookie parameters).

To achieve it, use Pydantic's model_config = {"extra": "forbid"}:

This applies to Query, Header, and Cookie parameters, read the new docs:

You can restrict form fields to only include those declared in a Pydantic model and forbid any extra field sent in the request using Pydantic's model_config = {"extra": "forbid"}:

Read the new docs: Form Models - Forbid Extra Form Fields.

Now you can declare form fields with Pydantic models:

Read the new docs: Form Models.

This release is mainly a big internal refactor to enable adding support for Pydantic models for Form fields, but that feature comes in the next release.

This release shouldn't affect apps using FastAPI in any way. You don't even have to upgrade to this version yet. It's just a checkpoint. 🤓

This release is mainly internal refactors, it shouldn't affect apps using FastAPI in any way. You don't even have to upgrade to this version yet. There are a few bigger releases coming right after. 🚀

Before this, fastapi would include the standard dependencies, with Uvicorn and the fastapi-cli, etc.

And fastapi-slim would not include those standard dependencies.

Now fastapi doesn't include those standard dependencies unless you install with pip install "fastapi[standard]".

Before, you would install pip install fastapi, now you should include the standard optional dependencies (unless you want to exclude one of those): pip install "fastapi[standard]".

This change is because having the standard optional dependencies installed by default was being inconvenient to several users, and having to install instead fastapi-slim was not being a feasible solution.

Discussed here: #11522 and here: #11525

In short, if you had dependencies that looked like:

Now you need to make sure you raise again after except, just as you would in regular Python:

Read more in the advisory: Content-Type Header ReDoS.

Using resources from dependencies with yield in background tasks is no longer supported.

This change is what supports the new features, read below. 🤓

Dependencies with yield now can raise HTTPException and other exceptions after yield. 🎉

Read the new docs here: Dependencies with yield and HTTPException.

Before FastAPI 0.106.0, raising exceptions after yield was not possible, the exit code in dependencies with yield was executed after the response was sent, so Exception Handlers would have already run.

This was designed this way mainly to allow using the same objects "yielded" by dependencies inside of background tasks, because the exit code would be executed after the background tasks were finished.

Nevertheless, as this would mean waiting for the response to travel through the network while unnecessarily holding a resource in a dependency with yield (for example a database connection), this was changed in FastAPI 0.106.0.

Additionally, a background task is normally an independent set of logic that should be handled separately, with its own resources (e.g. its own database connection).

If you used to rely on this behavior, now you should create the resources for background tasks inside the background task itself, and use internally only data that doesn't depend on the resources of dependencies with yield.

For example, instead of using the same database session, you would create a new database session inside of the background task, and you would obtain the objects from the database using this new session. And then instead of passing the object from the database as a parameter to the background task function, you would pass the ID of that object and then obtain the object again inside the background task function.

The sequence of execution before FastAPI 0.106.0 was like this diagram:

Time flows from top to bottom. And each column is one of the parts interacting or executing code.

The new execution flow can be found in the docs: Execution of dependencies with yield.

✨ Support for Pydantic v2 ✨

Pydantic version 2 has the core re-written in Rust and includes a lot of improvements and features, for example:

...all this while keeping the same Python API. In most of the cases, for simple models, you can simply upgrade the Pydantic version and get all the benefits. 🚀

In some cases, for pure data validation and processing, you can get performance improvements of 20x or more. This means 2,000% or more. 🤯

When you use FastAPI, there's a lot more going on, processing the request and response, handling dependencies, executing your own code, and particularly, waiting for the network. But you will probably still get some nice performance improvements just from the upgrade.

The focus of this release is compatibility with Pydantic v1 and v2, to make sure your current apps keep working. Later there will be more focus on refactors, correctness, code improvements, and then performance improvements. Some third-party early beta testers that ran benchmarks on the beta releases of FastAPI reported improvements of 2x - 3x. Which is not bad for just doing pip install --upgrade fastapi pydantic. This was not an official benchmark and I didn't check it myself, but it's a good sign.

Check out the Pydantic migration guide.

For the things that need changes in your Pydantic models, the Pydantic team built bump-pydantic.

A command line tool that will process your code and update most of the things automatically for you. Make sure you have your code in git first, and review each of the changes to make sure everything is correct before committing the changes.

This version of FastAPI still supports Pydantic v1. And although Pydantic v1 will be deprecated at some point, it will still be supported for a while.

This means that you can install the new Pydantic v2, and if something fails, you can install Pydantic v1 while you fix any problems you might have, but having the latest FastAPI.

There are tests for both Pydantic v1 and v2, and test coverage is kept at 100%.

There are new parameter fields supported by Pydantic Field() for:

The new parameter fields are:

...you can read about them in the Pydantic docs.

Now Pydantic Settings is an additional optional package (included in "fastapi[all]"). To use settings you should now import from pydantic_settings import BaseSettings instead of importing from pydantic directly.

PR #9816 by @tiangolo, included all the work done (in multiple PRs) on the beta branch (main-pv2).

✨ Add support for OpenAPI 3.1.0. PR #9770 by @tiangolo.

✨ Add support for deque objects and children in jsonable_encoder. PR #9433 by @cranium.

This release adds support for dependencies and parameters using Annotated and recommends its usage. ✨

This has several benefits, one of the main ones is that now the parameters of your functions with Annotated would not be affected at all.

If you call those functions in other places in your code, the actual default values will be kept, your editor will help you notice missing required arguments, Python will require you to pass required arguments at runtime, you will be able to use the same functions for different things and with different libraries (e.g. Typer will soon support Annotated too, then you could use the same function for an API and a CLI), etc.

Because Annotated is standard Python, you still get all the benefits from editors and tools, like autocompletion, inline errors, etc.

One of the biggest benefits is that now you can create Annotated dependencies that are then shared by multiple path operation functions, this will allow you to reduce a lot of code duplication in your codebase, while keeping all the support from editors and tools.

For example, you could have code like this:

There's a bit of code duplication for the dependency:

...the bigger the codebase, the more noticeable it is.

Now you can create an annotated dependency once, like this:

And then you can reuse this Annotated dependency:

...and CurrentUser has all the typing information as User, so your editor will work as expected (autocompletion and everything), and FastAPI will be able to understand the dependency defined in Annotated. 😎

Roughly all the docs have been rewritten to use Annotated as the main way to declare parameters and dependencies. All the examples in the docs now include a version with Annotated and a version without it, for each of the specific Python versions (when there are small differences/improvements in more recent versions). There were around 23K new lines added between docs, examples, and tests. 🚀

The key updated docs are:

Special thanks to @nzig for the core implementation and to @adriangb for the inspiration and idea with Xpresso! 🚀

Now, instead of using independent startup and shutdown events, you can define that logic in a single function with yield decorated with @asynccontextmanager (an async context manager).

Note: This is the recommended way going forward, instead of using startup and shutdown events.

Read more about it in the new docs: Advanced User Guide: Lifespan Events.

🚨 This is a security fix. Please upgrade as soon as possible.

Now you can declare the return type / response_model in the function return type annotation:

FastAPI will use the return type annotation to perform:

Before this version it was only supported via the response_model parameter.

Read more about it in the new docs: Response Model - Return Type.

Highlights of this release:

This version of FastAPI drops support for Python 3.6. 🔥 Please upgrade to a supported version of Python (3.7 or above), Python 3.6 reached the end-of-life a long time ago. 😅☠

🚨 This is probably the last release (or one of the last releases) to support Python 3.6. 🔥

Python 3.6 reached the end-of-life and is no longer supported by Python since around a year ago.

You hopefully updated to a supported version of Python a while ago. If you haven't, you really should.

🚨 This is probably the last release (or one of the last releases) to support Python 3.6. 🔥

Python 3.6 reached the end-of-life and is no longer supported by Python since around a year ago.

You hopefully updated to a supported version of Python a while ago. If you haven't, you really should.

If you are using response_model with some type that doesn't include None but the function is returning None, it will now raise an internal server error, because you are returning invalid data that violates the contract in response_model. Before this release it would allow breaking that contract returning None.

For example, if you have an app like this:

...calling the path /items/invalidnone will raise an error, because None is not a valid type for the response_model declared with Item.

You could also be implicitly returning None without realizing, for example:

If you have path operations using response_model that need to be allowed to return None, make it explicit in response_model using Union[Something, None]:

This way the data will be correctly validated, you won't have an internal server error, and the documentation will also reflect that this path operation could return None (or null in JSON).

✨ Add support for omitting ... as default value when declaring required parameters with:

New docs at Tutorial - Query Parameters and String Validations - Make it required. PR #4906 by @tiangolo.

Up to now, declaring a required parameter while adding additional validation or metadata needed using ... (Ellipsis).

...all these parameters are required because the default value is ... (Ellipsis).

But now it's possible and supported to just omit the default value, as would be done with Pydantic fields, and the parameters would still be required.

✨ For example, this is now supported:

To declare parameters as optional (not required), you can set a default value as always, for example using None:

This release includes upgrades to third-party packages that handle security issues. Although there's a chance these issues don't affect you in particular, please upgrade as soon as possible.

Dependencies with yield can now catch HTTPException and custom exceptions. For example:

After the dependency with yield handles the exception (or not) the exception is raised again. So that any exception handlers can catch it, or ultimately the default internal ServerErrorMiddleware.

If you depended on exceptions not being received by dependencies with yield, and receiving an exception breaks the code after yield, you can use a block with try and finally:

...that way the finally block is run regardless of any exception that might happen.

This means that now, if you set a value in a context variable before yield, the value would still be available after yield (as you would intuitively expect). And it also means that you can reset the context variable with a token afterwards.

For example, this works correctly now:

...before this change it would raise an error when resetting the context variable, because the contextvars context was different, because of the way it was implemented.

Note: You probably don't need contextvars, and you should probably avoid using them. But they are powerful and useful in some advanced scenarios, for example, migrating from code that used Flask's g semi-global variable.

Technical Details: If you want to know more of the technical details you can check out the PR description #4575.

There's nothing interesting in this particular FastAPI release. It is mainly to enable/unblock the release of the next version of Pydantic that comes packed with features and improvements. 🤩

This release just upgrades Starlette to the latest version, 0.16.0, which includes several bug fixes and some small breaking changes.

These last three consecutive releases are independent so that you can migrate gradually:

This way, in case there was a breaking change for your code in one of the releases, you can still benefit from the previous upgrades. ✨

Also upgrades the ranges of optional dependencies:

This release adds support for Trio. ✨

It upgrades the version of Starlette to 0.15.0, now based on AnyIO, and the internal async components in FastAPI are now based on AnyIO as well, making it compatible with both asyncio and Trio.

You can read the docs about running FastAPI with Trio using Hypercorn.

This release also removes graphene as an optional dependency for GraphQL. If you need to work with GraphQL, the recommended library now is Strawberry. You can read the new FastAPI with GraphQL docs.

This release has no breaking changes. 🎉

It upgrades the version ranges of sub-dependencies to allow applications using FastAPI to easily upgrade them.

Soon there will be a new FastAPI release upgrading Starlette to take advantage of recent improvements, but as that has a higher chance of having breaking changes, it will be in a separate release.

This change fixes a CSRF security vulnerability when using cookies for authentication in path operations with JSON payloads sent by browsers.

In versions lower than 0.65.2, FastAPI would try to read the request payload as JSON even if the content-type header sent was not set to application/json or a compatible JSON media type (e.g. application/geo+json).

So, a request with a content type of text/plain containing JSON data would be accepted and the JSON data would be extracted.

But requests with content type text/plain are exempt from CORS preflights, for being considered Simple requests. So, the browser would execute them right away including cookies, and the text content could be a JSON string that would be parsed and accepted by the FastAPI application.

See CVE-2021-32677 for more details.

Thanks to Dima Boger for the security report! 🙇🔒

Up to now, for several options, the only way to apply them to a group of path operations was in include_router. That works well, but the call to app.include_router() or router.include_router() is normally done in another file.

That means that, for example, to apply authentication to all the path operations in a router it would end up being done in a different file, instead of keeping related logic together.

Setting options in include_router still makes sense in some cases, for example, to override or increase configurations from a third party router included in an app. But in a router that is part of a bigger application, it would probably make more sense to add those settings when creating the APIRouter.

This allows setting the (mostly new) parameters (additionally to the already existing parameters):

This allows setting the (mostly new) parameters (additionally to the already existing parameters):

Most of these settings are now supported in APIRouter, which normally lives closer to the related code, so it is recommended to use APIRouter when possible.

But include_router is still useful to, for example, adding options (like dependencies, prefix, and tags) when including a third party router, or a generic router that is shared between several projects.

This PR allows setting the (mostly new) parameters (additionally to the already existing parameters):

Note: all the previous parameters are still there, so it's still possible to declare dependencies in include_router.

PR #2434 (above) includes new or updated docs:

📝 Add FastAPI monitoring blog post to External Links. PR #2324 by @louisguitton.

Upgrade Starlette supported range to include the latest 0.12.7. The new range is 0.11.1,<=0.12.7. PR #367 by @dedsm.

Add test for OpenAPI schema with duplicate models from PR #333 by @dmontagu. PR #385.

Fix typo in docs for features. PR #380 by @MartinoMensio.

Fix source code limit for example in Query Parameters. PR #366 by @Smashman.

Update wording in docs about OAuth2 scopes. PR #371 by @cjw296.

Update docs for Enums to inherit from str and improve Swagger UI rendering. PR #351.

Fix regression, add Swagger UI deep linking again. PR #350.

Add test for having path templates in prefix of .include_router. PR #349.

Add note to docs: Include the same router multiple times with different prefix. PR #348.

Fix OpenAPI/JSON Schema generation for two functions with the same name (in different modules) with the same composite bodies.

Add section in docs about External Links and Articles. PR #341.

Remove Pipfile.lock from the repository as it is only used by FastAPI contributors (developers of FastAPI itself). See the PR for more details. PR #340.

Update section about Help FastAPI - Get Help. PR #339.

Refine internal type declarations to improve/remove Mypy errors in users' code. PR #338.

Update and clarify SQL tutorial with SQLAlchemy. PR #331 by @mariacamilagl.

Add SQLite online viewers to the docs. PR #330 by @cyrilbois.

Add support for Pydantic's ORM mode:

Remove/clean unused RegEx code in routing. PR #314 by @dmontagu.

Use default response status code descriptions for additional responses. PR #313 by @duxiaoyao.

Upgrade Pydantic support to 0.28. PR #320 by @jekirl.

Fix handling an empty-body request with a required body param. PR #311.

Fix broken link in docs: Return a Response directly. PR #306 by @dmontagu.

Fix docs discrepancy in docs for Response Model. PR #288 by @awiddersheim.

Implement dependency cache per request.

Implement dependency overrides for testing.

Fix auto_error=False handling in HTTPBearer security scheme. Do not raise when there's an incorrect Authorization header if auto_error=False. PR #282.

Fix type declaration of HTTPException. PR #279.

Fix broken link in docs about OAuth 2.0 with scopes. PR #275 by @dmontagu.

Refactor param extraction using Pydantic Field:

Separate error handling for validation errors.

Fix support for paths in path parameters without needing explicit Path(...).

Update docs for testing FastAPI. Include using POST, sending JSON, testing headers, etc. New documentation: Testing. PR #271.

Fix type declaration of response_model to allow generic Python types as List[Model]. Mainly to fix mypy for users. PR #266.

Add support for Pydantic's include, exclude, by_alias.

Add CONTRIBUTING.md file to GitHub, to help new contributors. PR #255 by @wshayes.

Add support for Pydantic's skip_defaults:

Add support for WebSockets with dependencies and parameters.

Upgrade the compatible version of Pydantic to 0.26.0.

Upgrade the compatible version of Starlette to 0.12.0.

Add OAuth2 redirect page for Swagger UI. This allows having delegated authentication in the Swagger UI docs. For this to work, you need to add {your_origin}/docs/oauth2-redirect to the allowed callbacks in your OAuth2 provider (in Auth0, Facebook, Google, etc).

Make Swagger UI and ReDoc route handlers (path operations) be async functions instead of lambdas to improve performance. PR #241 by @Trim21.

Make Swagger UI and ReDoc URLs parameterizable, allowing to host and serve local versions of them and have offline docs. PR #112 by @euri10.

Add support for dependencies parameter:

Fix OpenAPI documentation of Starlette URL convertors. Specially useful when using path convertors, to take a whole path as a parameter, like /some/url/{p:path}. PR #234 by @euri10.

Make default parameter utilities exported from fastapi be functions instead of classes (the new functions return instances of those classes). To be able to override the return types and fix mypy errors in FastAPI's users' code. Applies to Path, Query, Header, Cookie, Body, Form, File, Depends, and Security. PR #226 and PR #231.

Separate development scripts test.sh, lint.sh, and format.sh. PR #232.

Re-enable black formatting checks for Python 3.7. PR #229 by @zamiramir.

On body parsing errors, raise from previous exception, to allow better introspection in logging code. PR #192 by @ricardomomm.

Use Python logger named "fastapi" instead of root logger. PR #222 by @euri10.

Upgrade Pydantic to version 0.25. PR #225 by @euri10.

Fix typo in routing. PR #221 by @djlambert.

Add typing information to package including file py.typed. PR #209 by @meadsteve.

Add FastAPI bot for Gitter. To automatically announce new releases. PR #189.

Include Hypercorn as an alternative ASGI server in the docs. PR #187.

Add docs for Static Files and Templates. PR #186.

Add docs for handling Response Cookies and Response Headers. PR #185.

Fix typos in docs. PR #176 by @chdsbd.

Rename path operation decorator parameter content_type to response_class. PR #183.

Add docs for HTTP Basic Auth. PR #177.

Upgrade HTTP Basic Auth handling with automatic headers (automatic browser login prompt). PR #175.

Update dependencies for security. PR #174.

Add docs for Middleware. PR #173.

Make Flit publish from CI. PR #170.

Add documentation about handling CORS (Cross-Origin Resource Sharing). PR #169.

By default, encode by alias. This allows using Pydantic alias parameters working by default. PR #168.

Upgrade path operation docstring parsing to support proper Markdown descriptions. New documentation at Path Operation Configuration. PR #163.

Refactor internal usage of Pydantic to use correct data types. PR #164.

Upgrade Pydantic to version 0.23. PR #160 by @euri10.

Fix typo in Tutorial about Extra Models. PR #159 by @danielmichaels.

Fix Query Parameters URL examples in docs. PR #157 by @hayata-yamamoto.

Add support for multiple file uploads (as a single form field). New docs at: Multiple file uploads. PR #158.

Add docs for: Additional Status Codes. PR #156.

Improve automatically generated names of path operations in OpenAPI (in API docs). A function read_items instead of having a generated name "Read Items Get" will have "Read Items". PR #155.

Add docs for: Testing FastAPI. PR #151.

Update /docs Swagger UI to enable deep linking. This allows sharing the URL pointing directly to the path operation documentation in the docs. PR #148 by @wshayes.

Update development dependencies, Pipfile.lock. PR #150.

Include Falcon and Hug in: Alternatives, Inspiration and Comparisons.

Fix bug: handling additional responses in APIRouter.include_router(). PR #140.

Fix typo in SQL tutorial. PR #138 by @mostaphaRoudsari.

Fix typos in section about nested models and OAuth2 with JWT. PR #127 by @mmcloud.

Add auto_error parameter to security utility functions. Allowing them to be optional. Also allowing to have multiple alternative security schemes that are then checked in a single dependency instead of each one verifying and returning the error to the client automatically when not satisfied. PR #134.

Update SQL Tutorial to close database sessions even when there are exceptions. PR #89 by @alexiri.

Fix duplicate dependency in pyproject.toml. PR #128 by @zxalif.

Add Gitter chat, badge, links, etc. https://gitter.im/tiangolo/fastapi . PR #117.

Add docs about Extending OpenAPI. PR #126.

Make Travis run Ubuntu Xenial (newer version) and Python 3.7 instead of Python 3.7-dev. PR #92 by @blueyed.

Fix duplicated param variable creation. PR #123 by @yihuang.

Add note in Response Model docs about why using a function parameter instead of a function return type annotation. PR #109 by @JHSaunders.

Fix event docs (startup/shutdown) function name. PR #105 by @stratosgear.

Fix OpenAPI (JSON Schema) for declarations of Python Union (JSON Schema additionalProperties). PR #121.

Update Background Tasks with a note on Celery.

Document response models using unions and lists, updated at: Extra Models. PR #108.

Add support for Background Tasks in path operation functions and dependencies. New documentation about Background Tasks is here. PR #103.

Add support for .websocket_route() in APIRouter. PR #100 by @euri10.

New docs section about Events: startup - shutdown. PR #99.

Upgrade compatible Pydantic version to 0.21.0. PR #90.

Add documentation for: Application Configuration.

Fix typo in docs. PR #76 by @matthewhegarty.

Fix link in "Deployment" to "Bigger Applications".

Make development scripts executable. PR #76 by @euri10.

Add support for adding tags in app.include_router(). PR #55 by @euri10. Documentation updated in the section: Bigger Applications.

Update docs related to Uvicorn to use new --reload option from version 0.5.x. PR #74.

Update isort imports and scripts to be compatible with newer versions. PR #75.

Update technical details about async def handling with respect to previous frameworks. PR #64 by @haizaar.

Add deployment documentation for Docker in Raspberry Pi and other architectures.

Trigger Docker images build on Travis CI automatically. PR #65.

Add technical details about async def handling to docs. PR #61.

Add docs for Debugging FastAPI applications in editors.

Clarify Bigger Applications deployed with Docker.

Add section about History, Design and Future.

Add docs for using WebSockets with FastAPI. PR #62.

Introduce new project generator based on FastAPI and PostgreSQL: https://github.com/tiangolo/full-stack-fastapi-postgresql. PR #52.

Update SQL tutorial with SQLAlchemy, using Depends to improve editor support and reduce code repetition. PR #52.

Improve middleware naming in tutorial for SQL with SQLAlchemy https://fastapi.tiangolo.com/tutorial/sql-databases/.

Update SQL with SQLAlchemy tutorial at https://fastapi.tiangolo.com/tutorial/sql-databases/ using the new official request.state. PR #45.

Upgrade Starlette to version 0.11.1 and add required compatibility changes. PR #44.

Add section about helping and getting help with FastAPI.

Add note about path operations order in docs.

Update section about error handling with more information and make relation with Starlette error handling utilities more explicit. PR #41.

Add Development - Contributing section to the docs. PR #42.

Add new HTTPException with support for custom headers. With new documentation for handling errors at: https://fastapi.tiangolo.com/tutorial/handling-errors/. PR #35.

Add documentation to use Starlette Request object directly. Check #25 by @euri10.

Add issue templates to simplify reporting bugs, getting help, etc: #34.

Update example for the SQLAlchemy tutorial at https://fastapi.tiangolo.com/tutorial/sql-databases/ using middleware and database session attached to request.

Add openapi_prefix, support for reverse proxy and mounting sub-applications. See the docs at https://fastapi.tiangolo.com/advanced/sub-applications-proxy/: #26 by @kabirkhan.

Update docs/tutorial for SQLAlchemy including note about DB Browser for SQLite.

Fix typos in Security section: #24 by @kkinder.

Add support for Pydantic custom JSON encoders: #21 by @euri10.

**Examples:**

Example 1 (python):
```python
from fastapi import FastAPI
from pydantic import BaseModel as BaseModelV2
from pydantic.v1 import BaseModel


class Item(BaseModel):
    name: str
    description: str | None = None


class ItemV2(BaseModelV2):
    title: str
    summary: str | None = None


app = FastAPI()


@app.post("/items/", response_model=ItemV2)
def create_item(item: Item):
    return {"title": item.name, "summary": item.description}
```

Example 2 (python):
```python
from typing import Annotated, Literal

from fastapi import FastAPI, Query
from pydantic import BaseModel, Field

app = FastAPI()


class FilterParams(BaseModel):
    limit: int = Field(100, gt=0, le=100)
    offset: int = Field(0, ge=0)
    order_by: Literal["created_at", "updated_at"] = "created_at"
    tags: list[str] = []


@app.get("/items/")
async def read_items(filter_query: Annotated[FilterParams, Query()]):
    return filter_query
```

Example 3 (python):
```python
from typing import Annotated

from fastapi import FastAPI, Header
from pydantic import BaseModel

app = FastAPI()


class CommonHeaders(BaseModel):
    host: str
    save_data: bool
    if_modified_since: str | None = None
    traceparent: str | None = None
    x_tag: list[str] = []


@app.get("/items/")
async def read_items(headers: Annotated[CommonHeaders, Header()]):
    return headers
```

Example 4 (python):
```python
from typing import Annotated

from fastapi import Cookie, FastAPI
from pydantic import BaseModel

app = FastAPI()


class Cookies(BaseModel):
    session_id: str
    fatebook_tracker: str | None = None
    googall_tracker: str | None = None


@app.get("/items/")
async def read_items(cookies: Annotated[Cookies, Cookie()]):
    return cookies
```

---

## Repository Management¶

**URL:** https://fastapi.tiangolo.com/management/

**Contents:**
- Repository Management¶
- Owner¶
- Team¶
- FastAPI Experts¶
- External Contributions¶

Here's a short description of how the FastAPI repository is managed and maintained.

I, @tiangolo, am the creator and owner of the FastAPI repository. 🤓

I normally give the final review to each PR before merging them. I make the final decisions on the project, I'm the BDFL. 😅

There's a team of people that help manage and maintain the project. 😎

They have different levels of permissions and specific instructions.

Some of the tasks they can perform include:

You can see the current team members in FastAPI People - Team.

Joining the team is by invitation only, and I could update or remove permissions, instructions, or membership.

The people that help others the most in GitHub Discussions can become FastAPI Experts.

This is normally the best way to contribute to the project.

External contributions are very welcome and appreciated, including answering questions, submitting PRs, etc. 🙇‍♂️

There are many ways to help maintain FastAPI.

---

## Repository Management Tasks¶

**URL:** https://fastapi.tiangolo.com/management-tasks/

**Contents:**
- Repository Management Tasks¶
- Be Nice¶
  - When Things are Difficult¶
- Edit PR Titles¶
- Add Labels to PRs¶
- Add Labels to Translation PRs¶
- Merge Translation PRs¶
- First Translation PR¶
- Review PRs¶
- FastAPI People PRs¶

These are the tasks that can be performed to manage the FastAPI repository by team members.

This section is useful only to a handful of people, team members with permissions to manage the repository. You can probably skip it. 😉

...so, you are a team member of FastAPI? Wow, you are so cool! 😎

You can help with everything on Help FastAPI - Get Help the same ways as external contributors. But additionally, there are some tasks that only you (as part of the team) can perform.

Here are the general instructions for the tasks you can perform.

Thanks a lot for your help. 🙇

First of all, be nice. 😊

You probably are super nice if you were added to the team, but it's worth mentioning it. 🤓

When things are great, everything is easier, so that doesn't need much instructions. But when things are difficult, here are some guidelines.

Try to find the good side. In general, if people are not being unfriendly, try to thank their effort and interest, even if you disagree with the main subject (discussion, PR), just thank them for being interested in the project, or for having dedicated some time to try to do something.

It's difficult to convey emotion in text, use emojis to help. 😅

In discussions and PRs, in many cases, people bring their frustration and show it without filter, in many cases exaggerating, complaining, being entitled, etc. That's really not nice, and when it happens, it lowers our priority to solve their problems. But still, try to breath, and be gentle with your answers.

Try to avoid using bitter sarcasm or potentially passive-aggressive comments. If something is wrong, it's better to be direct (try to be gentle) than sarcastic.

Try to be as specific and objective as possible, avoid generalizations.

For conversations that are more difficult, for example to reject a PR, you can ask me (@tiangolo) to handle it directly.

Once the PR is merged, a GitHub Action (latest-changes) will use the PR title to update the latest changes automatically.

So, having a nice PR title will not only look nice in GitHub, but also in the release notes. 📝

The same GitHub Action latest-changes uses one label in the PR to decide the section in the release notes to put this PR in.

Make sure you use a supported label from the latest-changes list of labels:

Some tools like Dependabot, will add some labels, like dependencies, but have in mind that this label is not used by the latest-changes GitHub Action, so it won't be used in the release notes. Please make sure one of the labels above is added.

When there's a PR for a translation, apart from adding the lang-all label, also add a label for the language.

There will be a label for each language using the language code, like lang-{lang code}, for example, lang-es for Spanish, lang-fr for French, etc.

The label awaiting-review is special, only used for translations. A GitHub Action will detect it, then it will read the language label, and it will update the GitHub Discussions managing the translations for that language to notify people that there's a new translation to review.

Once a native speaker comes, reviews the PR, and approves it, the GitHub Action will come and remove the awaiting-review label, and add the approved-1 label.

This way, we can notice when there are new translations ready, because they have the approved-1 label.

For Spanish, as I'm a native speaker and it's a language close to me, I will give it a final review myself and in most cases tweak the PR a bit before merging it.

For the other languages, confirm that:

...it could be translated as:

...but needs to keep the exact tip keyword. If it was translated to consejo, like:

it would change the style to the default one, it would look like:

Those don't have to be translated, but if they are, they need to be written as:

When there's a first translation for a language, it will have a docs/{lang code}/docs/index.md translated file and a docs/{lang code}/mkdocs.yml.

For example, for Bosnian, it would be:

The mkdocs.yml file will have only the following content:

The language code would normally be in the ISO 639-1 list of language codes.

In any case, the language code should be in the file docs/language_names.yml.

There won't be yet a label for the language code, for example, if it was Bosnian, there wouldn't be a lang-bs. Before creating the label and adding it to the PR, create the GitHub Discussion:

Update "Bosnian" with the new language.

And update the search link to point to the new language label that will be created, like lang-bs.

Create and add the label to that new Discussion just created, like lang-bs.

Then go back to the PR, and add the label, like lang-bs, and lang-all and awaiting-review.

Now the GitHub action will automatically detect the label lang-bs and will post in that Discussion that this PR is waiting to be reviewed.

If a PR doesn't explain what it does or why, ask for more information.

A PR should have a specific use case that it is solving.

Every month, a GitHub Action updates the FastAPI People data. Those PRs look like this one: 👥 Update FastAPI People.

If the tests are passing, you can merge it right away.

When people add external links they edit this file external_links.yml.

After checking all these things and ensuring the PR has the right labels, you can merge it.

Dependabot will create PRs to update dependencies for several things, and those PRs all look similar, but some are way more delicate than others.

When a question in GitHub Discussions has been answered, mark the answer by clicking "Mark as answer".

You can filter discussions by Questions that are Unanswered.

**Examples:**

Example 1 (unknown):
```unknown
🌐 Add Spanish translation for `docs/es/docs/teleporting.md`
```

Example 2 (unknown):
```unknown
/// tip

This is a tip.

///
```

Example 3 (unknown):
```unknown
/// tip

Esto es un consejo.

///
```

Example 4 (unknown):
```unknown
/// consejo

Esto es un consejo.

///
```

---

## Separate OpenAPI Schemas for Input and Output or Not¶

**URL:** https://fastapi.tiangolo.com/how-to/separate-openapi-schemas/

**Contents:**
- Separate OpenAPI Schemas for Input and Output or Not¶
- Pydantic Models for Input and Output¶
  - Model for Input¶
  - Input Model in Docs¶
  - Model for Output¶
  - Model for Output Response Data¶
  - Model for Output in Docs¶
  - Model for Input and Output in Docs¶
- Do not Separate Schemas¶
  - Same Schema for Input and Output Models in Docs¶

When using Pydantic v2, the generated OpenAPI is a bit more exact and correct than before. 😎

In fact, in some cases, it will even have two JSON Schemas in OpenAPI for the same Pydantic model, for input and output, depending on if they have default values.

Let's see how that works and how to change it if you need to do that.

Let's say you have a Pydantic model with default values, like this one:

If you use this model as an input like here:

...then the description field will not be required. Because it has a default value of None.

You can confirm that in the docs, the description field doesn't have a red asterisk, it's not marked as required:

But if you use the same model as an output, like here:

...then because description has a default value, if you don't return anything for that field, it will still have that default value.

If you interact with the docs and check the response, even though the code didn't add anything in one of the description fields, the JSON response contains the default value (null):

This means that it will always have a value, it's just that sometimes the value could be None (or null in JSON).

That means that, clients using your API don't have to check if the value exists or not, they can assume the field will always be there, but just that in some cases it will have the default value of None.

The way to describe this in OpenAPI, is to mark that field as required, because it will always be there.

Because of that, the JSON Schema for a model can be different depending on if it's used for input or output:

You can check the output model in the docs too, both name and description are marked as required with a red asterisk:

And if you check all the available Schemas (JSON Schemas) in OpenAPI, you will see that there are two, one Item-Input and one Item-Output.

For Item-Input, description is not required, it doesn't have a red asterisk.

But for Item-Output, description is required, it has a red asterisk.

With this feature from Pydantic v2, your API documentation is more precise, and if you have autogenerated clients and SDKs, they will be more precise too, with a better developer experience and consistency. 🎉

Now, there are some cases where you might want to have the same schema for input and output.

Probably the main use case for this is if you already have some autogenerated client code/SDKs and you don't want to update all the autogenerated client code/SDKs yet, you probably will want to do it at some point, but maybe not right now.

In that case, you can disable this feature in FastAPI, with the parameter separate_input_output_schemas=False.

Support for separate_input_output_schemas was added in FastAPI 0.102.0. 🤓

And now there will be one single schema for input and output for the model, only Item, and it will have description as not required:

This is the same behavior as in Pydantic v1. 🤓

**Examples:**

Example 1 (python):
```python
from fastapi import FastAPI
from pydantic import BaseModel


class Item(BaseModel):
    name: str
    description: str | None = None

# Code below omitted 👇
```

Example 2 (python):
```python
from fastapi import FastAPI
from pydantic import BaseModel


class Item(BaseModel):
    name: str
    description: str | None = None


app = FastAPI()


@app.post("/items/")
def create_item(item: Item):
    return item


@app.get("/items/")
def read_items() -> list[Item]:
    return [
        Item(
            name="Portal Gun",
            description="Device to travel through the multi-rick-verse",
        ),
        Item(name="Plumbus"),
    ]
```

Example 3 (python):
```python
from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel


class Item(BaseModel):
    name: str
    description: Optional[str] = None


app = FastAPI()


@app.post("/items/")
def create_item(item: Item):
    return item


@app.get("/items/")
def read_items() -> list[Item]:
    return [
        Item(
            name="Portal Gun",
            description="Device to travel through the multi-rick-verse",
        ),
        Item(name="Plumbus"),
    ]
```

Example 4 (python):
```python
from typing import List, Union

from fastapi import FastAPI
from pydantic import BaseModel


class Item(BaseModel):
    name: str
    description: Union[str, None] = None


app = FastAPI()


@app.post("/items/")
def create_item(item: Item):
    return item


@app.get("/items/")
def read_items() -> List[Item]:
    return [
        Item(
            name="Portal Gun",
            description="Device to travel through the multi-rick-verse",
        ),
        Item(name="Plumbus"),
    ]
```

---

## Virtual Environments¶

**URL:** https://fastapi.tiangolo.com/virtual-environments/

**Contents:**
- Virtual Environments¶
- Create a Project¶
- Create a Virtual Environment¶
- Activate the Virtual Environment¶
- Check the Virtual Environment is Active¶
- Upgrade pip¶
- Add .gitignore¶
- Install Packages¶
  - Install Packages Directly¶
  - Install from requirements.txt¶

When you work in Python projects you probably should use a virtual environment (or a similar mechanism) to isolate the packages you install for each project.

If you already know about virtual environments, how to create them and use them, you might want to skip this section. 🤓

A virtual environment is different than an environment variable.

An environment variable is a variable in the system that can be used by programs.

A virtual environment is a directory with some files in it.

This page will teach you how to use virtual environments and how they work.

If you are ready to adopt a tool that manages everything for you (including installing Python), try uv.

First, create a directory for your project.

What I normally do is that I create a directory named code inside my home/user directory.

And inside of that I create one directory per project.

When you start working on a Python project for the first time, create a virtual environment inside your project.

You only need to do this once per project, not every time you work.

To create a virtual environment, you can use the venv module that comes with Python.

If you have uv installed, you can use it to create a virtual environment.

By default, uv will create a virtual environment in a directory called .venv.

But you could customize it passing an additional argument with the directory name.

That command creates a new virtual environment in a directory called .venv.

You could create the virtual environment in a different directory, but there's a convention of calling it .venv.

Activate the new virtual environment so that any Python command you run or package you install uses it.

Do this every time you start a new terminal session to work on the project.

Or if you use Bash for Windows (e.g. Git Bash):

Every time you install a new package in that environment, activate the environment again.

This makes sure that if you use a terminal (CLI) program installed by that package, you use the one from your virtual environment and not any other that could be installed globally, probably with a different version than what you need.

Check that the virtual environment is active (the previous command worked).

This is optional, but it's a good way to check that everything is working as expected and you are using the virtual environment you intended.

If it shows the python binary at .venv/bin/python, inside of your project (in this case awesome-project), then it worked. 🎉

If it shows the python binary at .venv\Scripts\python, inside of your project (in this case awesome-project), then it worked. 🎉

If you use uv you would use it to install things instead of pip, so you don't need to upgrade pip. 😎

If you are using pip to install packages (it comes by default with Python), you should upgrade it to the latest version.

Many exotic errors while installing a package are solved by just upgrading pip first.

You would normally do this once, right after you create the virtual environment.

Make sure the virtual environment is active (with the command above) and then run:

If you are using Git (you should), add a .gitignore file to exclude everything in your .venv from Git.

If you used uv to create the virtual environment, it already did this for you, you can skip this step. 😎

Do this once, right after you create the virtual environment.

And * for Git means "everything". So, it will ignore everything in the .venv directory.

That command will create a file .gitignore with the content:

After activating the environment, you can install packages in it.

Do this once when installing or upgrading the packages your project needs.

If you need to upgrade a version or add a new package you would do this again.

If you're in a hurry and don't want to use a file to declare your project's package requirements, you can install them directly.

It's a (very) good idea to put the packages and versions your program needs in a file (for example requirements.txt or pyproject.toml).

If you have a requirements.txt, you can now use it to install its packages.

A requirements.txt with some packages could look like:

After you activated the virtual environment, you can run your program, and it will use the Python inside of your virtual environment with the packages you installed there.

You would probably use an editor, make sure you configure it to use the same virtual environment you created (it will probably autodetect it) so that you can get autocompletion and inline errors.

You normally have to do this only once, when you create the virtual environment.

Once you are done working on your project you can deactivate the virtual environment.

This way, when you run python it won't try to run it from that virtual environment with the packages installed there.

Now you're ready to start working on your project.

Do you want to understand what's all that above?

To work with FastAPI you need to install Python.

After that, you would need to install FastAPI and any other packages you want to use.

To install packages you would normally use the pip command that comes with Python (or similar alternatives).

Nevertheless, if you just use pip directly, the packages would be installed in your global Python environment (the global installation of Python).

So, what's the problem with installing packages in the global Python environment?

At some point, you will probably end up writing many different programs that depend on different packages. And some of these projects you work on will depend on different versions of the same package. 😱

For example, you could create a project called philosophers-stone, this program depends on another package called harry, using the version 1. So, you need to install harry.

Then, at some point later, you create another project called prisoner-of-azkaban, and this project also depends on harry, but this project needs harry version 3.

But now the problem is, if you install the packages globally (in the global environment) instead of in a local virtual environment, you will have to choose which version of harry to install.

If you want to run philosophers-stone you will need to first install harry version 1, for example with:

And then you would end up with harry version 1 installed in your global Python environment.

But then if you want to run prisoner-of-azkaban, you will need to uninstall harry version 1 and install harry version 3 (or just installing version 3 would automatically uninstall version 1).

And then you would end up with harry version 3 installed in your global Python environment.

And if you try to run philosophers-stone again, there's a chance it would not work because it needs harry version 1.

It's very common in Python packages to try the best to avoid breaking changes in new versions, but it's better to be safe, and install newer versions intentionally and when you can run the tests to check everything is working correctly.

Now, imagine that with many other packages that all your projects depend on. That's very difficult to manage. And you would probably end up running some projects with some incompatible versions of the packages, and not knowing why something isn't working.

Also, depending on your operating system (e.g. Linux, Windows, macOS), it could have come with Python already installed. And in that case it probably had some packages pre-installed with some specific versions needed by your system. If you install packages in the global Python environment, you could end up breaking some of the programs that came with your operating system.

When you install Python, it creates some directories with some files in your computer.

Some of these directories are the ones in charge of having all the packages you install.

That will download a compressed file with the FastAPI code, normally from PyPI.

It will also download files for other packages that FastAPI depends on.

Then it will extract all those files and put them in a directory in your computer.

By default, it will put those files downloaded and extracted in the directory that comes with your Python installation, that's the global environment.

The solution to the problems of having all the packages in the global environment is to use a virtual environment for each project you work on.

A virtual environment is a directory, very similar to the global one, where you can install the packages for a project.

This way, each project will have its own virtual environment (.venv directory) with its own packages.

When you activate a virtual environment, for example with:

Or if you use Bash for Windows (e.g. Git Bash):

That command will create or modify some environment variables that will be available for the next commands.

One of those variables is the PATH variable.

You can learn more about the PATH environment variable in the Environment Variables section.

Activating a virtual environment adds its path .venv/bin (on Linux and macOS) or .venv\Scripts (on Windows) to the PATH environment variable.

Let's say that before activating the environment, the PATH variable looked like this:

That means that the system would look for programs in:

That means that the system would look for programs in:

After activating the virtual environment, the PATH variable would look something like this:

That means that the system will now start looking first for programs in:

before looking in the other directories.

So, when you type python in the terminal, the system will find the Python program in

That means that the system will now start looking first for programs in:

before looking in the other directories.

So, when you type python in the terminal, the system will find the Python program in

An important detail is that it will put the virtual environment path at the beginning of the PATH variable. The system will find it before finding any other Python available. This way, when you run python, it will use the Python from the virtual environment instead of any other python (for example, a python from a global environment).

Activating a virtual environment also changes a couple of other things, but this is one of the most important things it does.

When you check if a virtual environment is active, for example with:

That means that the python program that will be used is the one in the virtual environment.

You use which in Linux and macOS and Get-Command in Windows PowerShell.

The way that command works is that it will go and check in the PATH environment variable, going through each path in order, looking for the program called python. Once it finds it, it will show you the path to that program.

The most important part is that when you call python, that is the exact "python" that will be executed.

So, you can confirm if you are in the correct virtual environment.

It's easy to activate one virtual environment, get one Python, and then go to another project.

And the second project wouldn't work because you are using the incorrect Python, from a virtual environment for another project.

It's useful being able to check what python is being used. 🤓

For example, you could be working on a project philosophers-stone, activate that virtual environment, install packages and work with that environment.

And then you want to work on another project prisoner-of-azkaban.

You go to that project:

If you don't deactivate the virtual environment for philosophers-stone, when you run python in the terminal, it will try to use the Python from philosophers-stone.

But if you deactivate the virtual environment and activate the new one for prisoner-of-askaban then when you run python it will use the Python from the virtual environment in prisoner-of-azkaban.

This is a simple guide to get you started and teach you how everything works underneath.

There are many alternatives to managing virtual environments, package dependencies (requirements), projects.

Once you are ready and want to use a tool to manage the entire project, packages dependencies, virtual environments, etc. I would suggest you try uv.

uv can do a lot of things, it can:

If you read and understood all this, now you know much more about virtual environments than many developers out there. 🤓

Knowing these details will most probably be useful in a future time when you are debugging something that seems complex, but you will know how it all works underneath. 😎

**Examples:**

Example 1 (unknown):
```unknown
// Go to the home directory
$ cd
// Create a directory for all your code projects
$ mkdir code
// Enter into that code directory
$ cd code
// Create a directory for this project
$ mkdir awesome-project
// Enter into that project directory
$ cd awesome-project
```

Example 2 (unknown):
```unknown
$ python -m venv .venv
```

Example 3 (unknown):
```unknown
$ source .venv/bin/activate
```

Example 4 (unknown):
```unknown
$ .venv\Scripts\Activate.ps1
```

---
