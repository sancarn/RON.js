# RON.js
Javascript Implementation of Ruby Object Notation

# Examples:

```js
//Parse nil
RON.parse("nil") //=> null

//Parse String:
RON.parse("\"abc\"") //=> "abc"

//Parse Integer
RON.parse("1") //=> 1

//Parse Float
RON.parse("1.1") //=> 1.1

//Parse NaN
RON.parse("NaN") //=> NaN

//Parse Symbols
RON.parse(":a") //=> Symbol(a)

//Parse Regex
RON.parse("/abc/i") //=> /abc/i

//Parse Array
RON.parse('["Awesome array",1,1.0,/abc/i,:someSymbol]') //=> ["Awesome array",1,1.0,/abc/i,Symbol(someSymbol)]

//Parse Hash
RON.parse('{:a=>1,:b=>[1,2,{"c"=>:d}]}')
/*
 * Equivalent of: 
 *     var hash = new Map()
 *     hash.set(Symbol("a"),1)
 *     var hash2 = new Map()
 *     hash2.set("c","d")
 *     hash.set(Symbol("b"),[1,2,hash2])
 */

//Symbols will be treated totally seperately to strings. The below would fail in Opal, but not in RON:
RON.parse('{:a=>1,"a"=>2}')

//You're even allowed objects as keys! This would fail in most libraries, but not in RON:
RON.parse('{[1,2,3]=>[4,5,6]}')

//Parse Objects:
RON.parse("#<ClassName {:vars=>{:@a=>1,:@b=>\"abc\"},:methods=>[:someMethod]}>")
/*
 * Equivalent of: 
 *     var Klass = (function ClassName(){})
 *     Klass.prototype = {}
 *     var obj = (new Klass)
 *     obj[Symbol("@a")] = 1; obj[Symbol("@b")] = "abc"; obj.__proto__[Symbol("@someMethod")] = function(){/*[Ruby]*/}
 */
 
 //Parse all the things!
 RON.parse(`[{
    :name=>"Freddy",
    :type=>"Dog",
    :object => #<Animal {:vars=>{:@sound=>"woof",:@size=>\"small\"},:methods=>[:bark]}>
  },{
    :name=>"Whizzo",
    :type=>"Cat",
    :object => #<Animal {:vars=>{:@sound=>"miao",:@size=>\"large\"},:methods=>[:miao]}>
  }]`)
```

# Road map:
* [x] Implement String
* [ ] Implement Int   (Hack)
* [ ] Implement Float (Hack)
* [ ] Implement Regex (Hack)
* [x] Implement Array
* [x] Implement Hash map
* [x] Implement Objects
* [x] Implement Recursive Objects
