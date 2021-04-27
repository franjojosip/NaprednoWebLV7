var express= require('express');
var res= express.response;

//Spremanje poruke u session varijablu
res.message= function(msg,type){
  type= type || 'info';
  var sess= this.req.session;
  sess.messages= sess.messages || [];
  sess.messages.push({type:type,string: msg });
};

//Funkcija koja se poziva ako se dogodi pogre�ka
res.error= function(msg){
  return this.message(msg,'success');
};

//Spremanje session varijable u lokalnu i brisanje session varijable
module.exports= function(req,res,next){
  res.locals.messages= req.session.messages || [];
  req.session.messages = [];
  next();
}; 