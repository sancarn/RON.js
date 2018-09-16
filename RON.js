(function(){
  class cRON {
    constructor(){
      this.__symbols = {};
    }
    _getSymbol(name){
      if(!this.__symbols[name]){
        this.__symbols[name] = Symbol(name);
      }
      return this.__symbols[name];
    }

    //used by _getList, to skip a portion of a string, taking into account escaped quotes
    _skipString(data){
      var str = data.replace(/\\./,"ww");
      for(var i=1;i<str.length;i++){
        if(str[i]==str[0]){
          return i;
        }
      }
    }
    //Get comma seperated list of values taking hierarchy into account
    _getList(sectionString){
      if(sectionString==""){
        return []
      }
      var arrayToParse = [];
      //track depth of {} and [] parens
      var depth = {"[]":0,"{}":0,"#<>":0};
      var getTotalDepth = ()=>{return Object.values(depth).reduce(((total,num)=>{return total+num;}));};
      var sCumulative = "";
      for(var i=0;i<sectionString.length;i++){
        var char = sectionString[i];
        switch(char){
          case "{":
            depth["{}"]++;
            sCumulative+=char;
            break;
          case "}":
            depth["{}"]--;
            sCumulative+=char;
            break;
          case "[":
            depth["[]"]++;
            sCumulative+=char;
            break;
          case "]":
            depth["[]"]--;
            sCumulative+=char;
            break;
          case "#":
            if(sectionString[i+1] == "<"){
              depth["#<>"]++;
              i=i++;
            }
            sCumulative+=char;
            break;
          case ">":
            if(sectionString[i-1]!="="){
              depth["#<>"]--;
            }
            sCumulative+=char;
            break;
          case ",":
            if(getTotalDepth()==0){
              arrayToParse.push(sCumulative);
              sCumulative="";
            } else {
              sCumulative+=char;
            }
            break;
          case "\"":
          case "'":
          case "`":
            var to = this._skipString(sectionString.substr(i));
            sCumulative += sectionString.substr(i,to+1);
            i += to;
            break;
          default:
            sCumulative+=char;
        }
      }
      arrayToParse.push(sCumulative);
      return arrayToParse;
    }
    //Get delimiter seperated list of values taking hierarchy into account
    _getKeyValue(sectionString){
      if(sectionString==""){
        return []
      }
      var output = {key:null, value:null};
      //track depth of {} and [] parens
      var depth = {"[]":0,"{}":0,"#<>":0};
      var getTotalDepth = ()=>{return Object.values(depth).reduce(((total,num)=>{return total+num;}));};
      var sCumulative = "";
      for(var i=0;i<sectionString.length;i++){
        var char = sectionString[i];
        var char2 = sectionString[i+1];
        switch(char){
          case "{":
            depth["{}"]++;
            sCumulative+=char;
            break;
          case "}":
            depth["{}"]--;
            sCumulative+=char;
            break;
          case "[":
            depth["[]"]++;
            sCumulative+=char;
            break;
          case "]":
            depth["[]"]--;
            sCumulative+=char;
            break;
          case "#":
            if(sectionString[i+1] == "<"){
              depth["#<>"]++;
              i=i++;
            }
            sCumulative+=char;
            break;
          case ">":
            if(sectionString[i-1]!="="){
              depth["#<>"]--;
            }
            sCumulative+=char;
            break;
          case "=":
            if(char2 == ">"){
              if(getTotalDepth()==0){
                output["key"] = sCumulative;;
                output["value"] = sectionString.substr(i+2);
                return output;
              } else {
                sCumulative+=char;
              }
            }
            break;
          case "\"":
          case "'":
          case "`":
            var to = this._skipString(sectionString.substr(i));
            sCumulative += sectionString.substr(i,to+1);
            i += to;
            break;
          default:
            sCumulative+=char;
        }
      }

      return null;
    }
    _createNamedObject(name){
      var Klass = eval("(function " + name + "(){})");
      Klass.prototype = {};
      return new Klass;
    }
    parse(hash){
      switch(hash[0]){
        case "{":
          if(hash.endsWith("}")){ //Hash
            //Get list of key-values
            var parseList = this._getList(hash.slice(1,-1));

            //Create hash as Map
            var hash = new Map();

            //Parse list elements to hash
            parseList.forEach((element)=>{
              var obj = this._getKeyValue(element);
              hash.set(this.parse(obj["key"]),this.parse(obj["value"]));
            })
            return hash
          } else {
            throw "Error: Expected \"}\" but found \"" + hash.substr(-1)+ "\"";
          }
          break;
        case "[":
          if(hash.endsWith("]")){ //Array
            var parseList = this._getList(hash.slice(1,-1));
            return parseList.map((element)=>{
              return this.parse(element);
            })
          } else {
            throw "Error: Expected \"]\" but found \"" + hash.substr(-1)+ "\"";
          }
          break;
        case "#":
          if(hash[1] == "<"){
            //object notation
            if(hash.endsWith(">")){
              //Assume all objects in standard format produced by this function:
              /*
                #Need to add recursive structure checking to this!
                # ==>  #<ClassName {:vars=>{:@a=>1,:@b=>"abc",...},:methods=>[:someMethod]}>
                def standardInspection(obj)
                  data = {}
                  data[:vars] = obj.instance_variables.map {|var| [var,obj.instance_variable_get(var)]}.to_h
                  data[:methods] = obj.methods - Object.methods
                  return "#<#{obj.class.name} #{data.inspect}>"
                end
              */

              hash = hash.slice(2,-1);
              var matches = /([^ ]+) (.+)/.exec(hash);
              var customObject = this._createNamedObject(matches[1]);
              var parse_data = this.parse(matches[2]);
              var varsArray = Array.from(parse_data.get(this._getSymbol("vars")));
              varsArray.forEach(function(kv){
                customObject[kv[0]] = kv[1];
              })

              var methodsArray = Array.from(parse_data.get(this._getSymbol("methods")));
              methodsArray.forEach(function(method){
                customObject.__proto__[method] = function(){/*[Ruby]*/};
              })

              return customObject;
            } else {
              throw "Error: Expected \">\" but found \"" + hash.substr(-1) + "\"";
            }
          } else {
            //comment
            throw "Error: Comments are currently unsupported";
          }
          break;
        case "'":
        case "\"":
          //String?
          if(hash.endsWith('"') || hash.endsWith("'")){
            hash = hash.replace(/\\(.)/,"$1");
            return hash.slice(1,-1);
          } else {
            throw "Error: Found '"+ hash.substr(-1,1) + "' while looking for '\"'";
          }
          break;
        case ":":
          //Symbol?
          if(/^\:[@$_A-Za-z][_A-Za-z0-9]*[!_=?A-Za-z0-9]?$/.test(hash)){
            //Is a symbol
            return this._getSymbol(hash.substr(1));
          } else {
            throw "Error: Not a valid symbol.";
          }
          break;
        case "/":
          //Regex
          if(/\/.+\/.*/.test(hash)){
            return eval(hash); //HACK
          } else {
            throw "Error: Invalid regex.";
          }
          break;
        case "n":
          if(hash=="nil"){
            return null;
          } else {
            throw "Error: Expected \"nil\" but found \"" + hash + "\"";
          }
          break;
        case "N":
          if(hash=="NaN"){
            return NaN;
          } else {
            throw "Error: Expected \"NaN\" but found \"" + hash + "\"";
          }
          break;
        default:
          //HACK
          return eval(hash);
          break;
      }
    }
  }
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined'){
    module.exports = new cRON();
  } else {
    window.RON =  new cRON();
  }
})()
