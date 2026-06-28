const ok  = (res,data,msg="success") => res.json({success:true,msg,data});
const err = (res,msg,status=400)     => res.status(status).json({success:false,msg});
module.exports = { ok, err };
