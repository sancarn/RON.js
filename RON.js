//TODO:
// Recursive object/hash solution
(function(){
  class cRON {
    constructor(){
      this.__symbols = {};
    }
    
    //Given the current depth and index, determine the new depth and index at sectionString[0]
    _measureDepth(depth,index,sectionString){
      switch(sectionString[index]){
          case "{":
            depth["{}"]++;
            depth["total"]++;
            break;
          case "}":
            depth["{}"]--;
            depth["total"]--;
            break;
          case "[":
            depth["[]"]++;
            depth["total"]++;
            break;
          case "]":
            depth["[]"]--;
            depth["total"]--;
            break;
          case "#":
            if(sectionString[index+1] == "<"){
              depth["#<>"]++;
              depth["total"]++;
              index++;
            }
            break;
          case ">":
            if(sectionString[index-1]!="="){
              depth["#<>"]--;
              depth["total"]--;
            }
            break;
      }
      return [depth,index]
    }
    
    //gets and uses the same symbol determined by passed name
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
      var depth = {"[]":0,"{}":0,"#<>":0, "total":0};
      var sCumulative = "";
      for(var i=0;i<sectionString.length;i++){
        [depth,i] = this._measureDepth(depth,i,sectionString)
        var char = sectionString[i];
        switch(char){
          case ",":
            if(depth.total==0){
              arrayToParse.push(sCumulative);
              sCumulative="";
            } else {
              sCumulative+=char;
            }
            break;
          case "\"":
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
      var depth = {"[]":0,"{}":0,"#<>":0, "total":0};
      var sCumulative = "";
      for(var i=0;i<sectionString.length;i++){
        [depth,i] = this._measureDepth(depth,i,sectionString)
        
        var char = sectionString[i];
        switch(char){
          case "=":
            if(sectionString[i+1] == ">"){
              if(depth.total==0){
                output["key"] = sCumulative;;
                output["value"] = sectionString.substr(i+2);
                return output;
              } else {
                sCumulative+=char;
              }
            }
            break;
          case "\"":
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
    
    /*
     * RON.parse()
     * The inner workings of this parser are as follows:
     * * If a string starts and ends with "{" and "}" respectively:
     *    ** Get the "," seperated list of "Key=>Value" pairs at 0 depth  ##USING this._getList()##
     *    ** Get the "=>" seperated Key-Value pair as an object where each of the returned strings have a total depth of 0: ##USING this._getKeyValue()##
     *        *** I.E. Keep in mind some key value pairs will have increased depth E.G. "{:a=>1}=>:something", so one needs to split only at depth == 0
     *        *** Also keep in mind some key value pairs will have strings which may contain "=>": {"a=>1"=>"b=>c"}
     *    ** Recursively parse both the key and the value.
     *    ** Return result
     * * If a string starts and ends with "[" and "]" respectively:
     *    ** Get the "," seperated list of values ##USING this._getList()##
     *    ** Recursively parse each value.
     *    ** Return result
     * * If a string starts and ends with "#<" and ">" respectively:
     *    ** Get the space delimited list at 0 depth of the internals (should be of the form #<ClassName {:vars=>{...},:methods=>[...]}>)
     *    ** First value is class name
     *    ** Parse hash and extract :vars (properties) and :methods from hash
     *    ** Create a new named object.
     *    ** Assign properties and methods
     *    ** Return named object
     * NOW WE ONLY NEED TO DEAL WITH STAND-ALONE TYPES!
     * * Parse strings taking into account escaped characters: "She said \"hello\" to him"
     * * Parse symbols (:...) as Symbol()
     * * Parse Regex /.../... as javascript's regex /.../...
     * * Parse nil as null
     * * Parse NaN (Float::NAN) as NaN
     * * Parse Integers as javascript's integers
     * * Parse Floats as javascript's floats
     */
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
              //Assume all objects in standard RON object form:
              //#<ClassName {:vars=>{:@a=>1,:@b=>"abc",...},:methods=>[:someMethod]}>
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
        case "n":
          //nil
          if(hash=="nil"){
            return null;
          } else {
            throw "Error: Expected \"nil\" but found \"" + hash + "\"";
          }
          break;
        case "N":
          //NaN (Float::NAN)
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
  //Browser and node support:
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined'){
    module.exports = new cRON();
  } else {
    window.RON =  new cRON();
  }
})()
