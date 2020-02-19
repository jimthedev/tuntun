**Before you do this you should understand the security implications of exposing your local computer to the web. You should keep your service exposed to the web for as short a period of time as possible.**

## Create a tunnel and spawn a process with access to that environment variable

Let's say you have a local Next.js web server. You normally run it using `yarn dev`. 

Today, however, you have added a new api endpoint that listens for a webhook to call it. You now need to expose your Next.js server to the web.  How do you do it in a way where your Next.js app can known the public url?

The answer: environment variables.

### Run the tunnel, which runs your process

tuntun will open a tunnel to the public internet, put the public url of that tunnel in two environment variables (LOCALHOST_RUN_HTTP and LOCALHOST_RUN_HTTPS) and spawn your process for you.

So for example if you wanted to spawn `yarn dev` which runs on port 3000 in `/Users/jcummins/projects/auth0` then you'd use the following command:

```bash
npx tuntun@1 service='localhost.run' action=spawn port=3000 workingDirectory='/Users/jcummins/projects/auth0' command='yarn' args='dev'
```

Then inside your process you can get the http or https url of the tunnel with:

```
process.env.TUNTUN_HTTP
process.env.TUNTUN_HTTPS
```

Ok, so you want to get a tunnel for your service so you can test your webhooks. How do you do it? You often need to open the tunnel, copy the url into your .env file, save it, start the app.

Not only that but you still need to update your webhooks urls with whatever service you are using. While we can't fix this second part (yet) we can fix the first part. What if you could just start the tunnel and have the tunnel pass that environment variable in 