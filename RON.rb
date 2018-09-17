require 'json'
class ::RON
  def stringify(obj)
    return obj.to_RON(references=nil)
  end
end

class ::Numeric
  def to_RON(references=nil)
    return self.to_s
  end
end

class ::String
  def to_RON(references=nil)
    return "\"" + self.to_s + "\""
  end
end

class ::Symbol
  def to_RON(references=nil)
    return ":" + self.to_s
  end
end

#Need to add recursive structure checking to this!
class ::Array
  def to_RON(references=nil)
    return "[" + self.map {|element| element.to_RON}.join(",") + "]"
  end
end

#Need to add recursive structure checking to this!
class ::Hash
  def to_RON(references=nil)
    return "{" + self.map do |key,value|
      [key.to_RON,"=>",value.to_RON].join
    end.join(",") + "}"
  end
end

#Need to add recursive structure checking to this!
class ::Object
  def to_RON(references=nil)
    data = {}
    data[:vars] = self.instance_variables.map {|var| [var,self.instance_variable_get(var)]}.to_h
    data[:methods] = self.methods - Object.methods
    return "#<#{self.class.name} #{data.inspect}>"
  end
end

class ::NilClass
  def to_RON(references=nil)
    return "nil"
  end
end
