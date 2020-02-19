console.log(Object.keys(process.env).length);
console.log(`in other, localhost run is: 
http: ${process.env.LOCALHOST_RUN_HTTP}
https: ${process.env.LOCALHOST_RUN_HTTPS}`);