const log = (level,msg,data={}) => console.log(JSON.stringify({level,msg,data,time:new Date().toISOString()}));
module.exports = { log };
