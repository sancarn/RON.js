class RON
  def stringify(obj)
    
  end
  
  #Need to add recursive structure checking to this!
  #Desired output:
  #  #<ClassName {:vars=>{:@a=>1,:@b=>"abc",...},:methods=>[:someMethod,...]}>
  #Might also want to include arguments of methods like so: {:name=>"myMethod",:params=>[{:name=>"a",optional=>false},{:name=>"b",optional=>true}]}
  def serialize_object(obj)
    data = {}
    data[:vars] = obj.instance_variables.map {|var| [var,obj.instance_variable_get(var)]}.to_h
    data[:methods] = obj.methods - Object.methods
    return "#<#{obj.class.name} #{data.inspect}>"
  end
end
