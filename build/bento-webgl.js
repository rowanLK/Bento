/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	window.GlSprites = {};
	GlSprites.SpriteRenderer = __webpack_require__(1);
	GlSprites.createTexture2D = __webpack_require__(13);

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var mixes = __webpack_require__(2)
	var createShader = __webpack_require__(4)
	var createBatch = __webpack_require__(11)
	var copy2 = __webpack_require__(51).vec2
	var number = __webpack_require__(52)
	var xtend = __webpack_require__(3)
	var texcoord = __webpack_require__(53)
	var mat4 = __webpack_require__(54)

	var ZERO = [0, 0]
	var TEXCOORD_DEFAULT = [0, 0, 1, 1]

	var tmp1 = [0, 0],
	    tmp2 = [0, 0],
	    tmpUV = [0, 0, 1, 1]

	function SpriteRenderer(gl, opt) {
	    if (!(this instanceof SpriteRenderer))
	        return new SpriteRenderer(gl, opt)
	    opt = opt||{}

	    this._blendSrc = number(opt.blendSrc, gl.SRC_ALPHA)
	    this._blendDst = number(opt.blendDst, gl.ONE_MINUS_SRC_ALPHA)
	    this._blendEnabled = opt.blend !== false

	    this.gl = gl
	    this.shader = opt.shader || createShader(gl, {
	        color: true,
	        texcoord: true
	    })
	    this.batch = opt.batch || createBatch(gl, xtend({ 
	        dynamic: true,
	        premultiplied: true 
	    }, opt))

	    this._bound = false
	    this.projection = mat4.create()
	    this.view = mat4.create()
	    this.transform = mat4.create()
	    this.transformStack = []

	    this.color = [1, 1, 1, 1]
	}

	mixes(SpriteRenderer, {

	    transform: {
	        get: function() {
	            return this.batch.transform
	        },

	        set: function(transform) {
	            this.batch.transform = transform
	        }
	    },

	    clear: function() {
	        this.batch.clear()
	        return this
	    },

	    ortho: function(width, height) {
	        mat4.ortho(this.projection, 0, width, height, 0, 0, 1)
	        this.updateUniforms()
	        return this
	    },

	    solid: function() {
	        this.batch.texture = null
	        return this
	    },

	    image: function(image, uv) {
	        this.batch.texture = image
	        this.batch.texcoord = uv || TEXCOORD_DEFAULT
	        return this
	    },

	    defaults: function() {
	        this.batch.defaults()
	        this.batch.color = this.color
	        return this
	    },

	    flush: function() {
	        this.batch.flush()
	        return this
	    },

	    fillRect: function(x, y, width, height) {
	        this.solid().defaults()
	        this.rect(x, y, width, height)
	        return this
	    },  

	    //just pushes a single quad with current attributes
	    rect: function(x, y, width, height) {
	        this.batch.color = this.color
	        this.batch.position[0] = x||0
	        this.batch.position[1] = y||0
	        this.batch.shape[0] = width||0
	        this.batch.shape[1] = height||0
	        this.batch.push()
	    },

	    stroke: function(x, y, width, height, thickness) {
	        this.batch.color = this.color
	        thickness = number(thickness, 1)
	        this.rect(x+thickness, y, width-thickness*2, thickness)
	        this.rect(x, y, thickness, height)
	        this.rect(x+thickness, y+height-thickness, width-thickness*2, thickness)
	        this.rect(x+width-thickness, y, thickness, height)
	    },

	    strokeRect: function(x, y, width, height, thickness) {
	        this.solid().defaults()
	        this.stroke(x, y, width, height, thickness)
	        return this
	    },

	    fillText: function(text, x, y, start, end) {
	        var oldTransform = text.batch.transform,
	            oldColor = text.batch.color,
	            wasBound = this._bound

	        if (wasBound) { 
	        //TODO: we could always assume dynamic and remove this condition
	            this.draw()
	            this.unbind()
	            this.clear()
	        }
	        text.batch.color = this.color
	        text.batch.transform = this.transform
	        text.draw(this.shader, x, y, start, end)
	        text.batch.color = oldColor
	        text.batch.transform = oldTransform
	        if (wasBound) {
	            this.bind()
	        }
	    }, 

	    drawImage: function(image, x, y, width, height) {
	        "use strict";
	        width = number(width, image.shape ? image.shape[0] : 0)
	        height = number(height, image.shape ? image.shape[1] : 0)

	        var uv = TEXCOORD_DEFAULT

	        if (arguments.length >= 9) {
	            var texSize = image.shape 
	            var clipPos = copy2(tmp1, arguments[1], arguments[2])
	            var clipSize = copy2(tmp2, arguments[3], arguments[4])

	            //get UV coordinates, storing in our temp array as to not 
	            //change constant default
	            uv = texcoord(clipPos, clipSize, texSize, tmpUV)

	            x = arguments[5]
	            y = arguments[6]
	            width = arguments[7]
	            height = arguments[8]
	        }

	        this.defaults()
	        // this.batch.rotation = rotation||0
	        // if (rotationOrigin)
	        //     this.batch.rotationOrigin = rotationOrigin
	        this.image(image, uv)
	        this.rect(x, y, width, height)
	        return this
	    },

	    sprite: function(sprite) {
	        this.batch.push(sprite)
	        return this
	    },

	    updateUniforms: function() {
	        this.shader.bind()
	        this.shader.uniforms.projection = this.projection
	        this.shader.uniforms.view = this.view
	    },

	    bind: function() {
	        var gl = this.gl
	        if (this._blendEnabled) {
	            gl.enable(gl.BLEND)
	            // gl.blendFunc(this._blendSrc, this._blendDst)
	            gl.blendFuncSeparate(this._blendSrc, this._blendDst, gl.ONE, this._blendDst);
	        }

	        this._bound = true
	        this.batch.bind(this.shader)
	        this.solid()
	        return this
	    },

	    draw: function() {
	        this.batch.draw()
	        return this
	    },

	    unbind: function() {
	        this.batch.unbind()
	        this._bound = false
	        return this
	    },

	    begin: function() {
	        this.bind()
	        this.clear()
	        return this
	    },

	    end: function() {
	        this.draw()
	        this.unbind()
	        return this
	    }
	})

	mixes(SpriteRenderer, __webpack_require__(64))

	module.exports = SpriteRenderer

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var xtend = __webpack_require__(3)

	var defaults = {
		enumerable: true,
		configurable: true
	}

	function mix(obj, entries) {
		for (var k in entries) {
			if (!entries.hasOwnProperty(k))
				continue
			var f = entries[k]
			if (typeof f === 'function') {
				obj[k] = f
			} else if (f && typeof f === 'object') {
				var def = xtend(defaults, f)
				Object.defineProperty(obj, k, def);
			}
		}
	}

	module.exports = function mixes(ctor, entries) {
		mix(ctor.prototype, entries)
	}

	module.exports.mix = mix

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = extend

	function extend() {
	    var target = {}

	    for (var i = 0; i < arguments.length; i++) {
	        var source = arguments[i]

	        for (var key in source) {
	            if (source.hasOwnProperty(key)) {
	                target[key] = source[key]
	            }
	        }
	    }

	    return target
	}


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var identity = __webpack_require__(5)
	var createShader = __webpack_require__(6)

	var POSITION_ATTRIBUTE = 'position',
	    NORMAL_ATTRIBUTE = 'normal',
	    COLOR_ATTRIBUTE = 'color',
	    TEXCOORD_ATTRIBUTE = 'texcoord';


	module.exports = function(gl, options) {
	    options = options||{}
	    options.texcoord = typeof options.texcoord === 'number' 
	                ? options.texcoord : (options.texcoord||0)
	        
	    var shaderSource = module.exports.generate(options),
	        vert = shaderSource.vertex,
	        frag = shaderSource.fragment,
	        uniforms = shaderSource.uniforms,
	        attribs = shaderSource.attributes
	    
	    var shader = createShader(gl, vert, frag, uniforms, attribs)
	    shader.bind()
	    for (var i=0; i<options.texcoord; i++) 
	        shader.uniforms['texture'+i] = i

	    var arr = identity( new Float32Array(16) )
	    shader.uniforms.projection = arr
	    shader.uniforms.model = arr
	    shader.uniforms.view = arr
	    shader.uniforms.tint = options.tint || [1, 1, 1, 1]

	    return shader
	}

	module.exports.generate = function(options) {
	    options = options||{}
	    options.texcoord = typeof options.texcoord === 'number' 
	                ? options.texcoord : (options.texcoord||0)

	    var pointSize = typeof options.pointSize === 'number' ? options.pointSize : 1;
	    var vert = typeof options.vertex === 'string'
	            ? options.vertex : createVertexShader(options.normal, options.color, options.texcoord, pointSize)
	    var frag = typeof options.fragment === 'string'
	            ? options.fragment : createFragmentShader(options.color, options.texcoord)

	    var uniforms = [
	        { type: 'mat4', name: 'projection' },
	        { type: 'mat4', name: 'view' },
	        { type: 'mat4', name: 'model' },
	        { type: 'vec4', name: 'tint' }
	    ]

	    //Similar to old school pipeline, we will use fixed locations
	    //http://www.opengl.org/sdk/docs/tutorials/ClockworkCoders/attributes.php
	    var attribs = [
	        { type: 'vec4', name: POSITION_ATTRIBUTE, location: 0 }
	    ]

	    if (options.normal)
	        attribs.push({ type: 'vec3', name: NORMAL_ATTRIBUTE, location: 1 })
	    if (options.color)
	        attribs.push({ type: 'vec4', name: COLOR_ATTRIBUTE, location: 2 })

	    var idx = 3
	    for (var i=0; i<options.texcoord; i++) {
	        uniforms.push({ type: 'sampler2D', name: 'texture'+i })
	        attribs.push({ type: 'vec2', name: TEXCOORD_ATTRIBUTE+i, location: idx++ })
	    }

	    return { vertex: vert, fragment: frag, uniforms: uniforms, attributes: attribs }
	}


	function createVertexShader(hasNormals, hasColors, numTexCoords, pointSize) {
	    numTexCoords = numTexCoords || 0;
	    var shader = "";
	    shader += "attribute vec4 "+POSITION_ATTRIBUTE+";\n"
	         + (hasNormals ? "attribute vec3 " + NORMAL_ATTRIBUTE + ";\n" : "")
	         + (hasColors ? "attribute vec4 " + COLOR_ATTRIBUTE + ";\n" : "");

	    var i;
	    pointSize = pointSize.toFixed(5);

	    for (i = 0; i < numTexCoords; i++) {
	        shader += "attribute vec2 " + TEXCOORD_ATTRIBUTE + i + ";\n";
	    }

	    shader += "uniform mat4 projection;\n";
	    shader += "uniform mat4 view;\n";
	    shader += "uniform mat4 model;\n";
	    
	    shader += (hasColors ? "varying vec4 v_col;\n" : "");

	    for (i = 0; i < numTexCoords; i++) {
	        shader += "varying vec2 v_tex" + i + ";\n";
	    }

	    shader += "\nvoid main() {\n" + "   gl_Position = projection * view * model * " + POSITION_ATTRIBUTE + ";\n"
	            + (hasColors ? "   v_col = " + COLOR_ATTRIBUTE + ";\n" : "");

	    for (i = 0; i < numTexCoords; i++) {
	        shader += "   v_tex" + i + " = " + TEXCOORD_ATTRIBUTE + i + ";\n";
	    }
	    shader += "   gl_PointSize = "+pointSize+";\n";
	    shader += "}\n";

	    return shader;
	}

	function createFragmentShader(hasColors, numTexCoords) {
	    numTexCoords = numTexCoords || 0;
	    var shader = "#ifdef GL_ES\n" + "precision mediump float;\n" + "#endif\n\n";
	 
	    if (hasColors) 
	        shader += "varying vec4 v_col;\n";

	    var i;
	    for (i = 0; i < numTexCoords; i++) {
	        shader += "varying vec2 v_tex" + i + ";\n";
	        shader += "uniform sampler2D texture" + i + ";\n";
	    }
	    shader += "uniform vec4 tint;\n";

	    shader += "\nvoid main() {\n" + "   gl_FragColor = ";

	    if (hasColors)
	        shader += "v_col"

	    if (hasColors && numTexCoords > 0) 
	        shader += " * ";
	    else if (!hasColors && !numTexCoords)
	        shader += "vec4(1.0)"

	    for (i = 0; i < numTexCoords; i++) {
	        if (i == numTexCoords - 1) {
	                shader += " texture2D(texture" + i + ",  v_tex" + i + ")";
	        } else {
	                shader += " texture2D(texture" + i + ",  v_tex" + i + ") *";
	        }
	    }

	    shader += " * tint"
	    shader += ";\n}";
	    return shader;
	}

/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = identity;

	/**
	 * Set a mat4 to the identity matrix
	 *
	 * @param {mat4} out the receiving matrix
	 * @returns {mat4} out
	 */
	function identity(out) {
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = 1;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = 1;
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	};

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var createUniformWrapper = __webpack_require__(7)
	var createAttributeWrapper = __webpack_require__(10)
	var makeReflect = __webpack_require__(9)

	//Shader object
	function Shader(gl, prog, vertShader, fragShader) {
	  this.gl = gl
	  this.handle = prog
	  this.attributes = null
	  this.uniforms = null
	  this.types = null
	  this.vertexShader = vertShader
	  this.fragmentShader = fragShader
	}

	//Binds the shader
	Shader.prototype.bind = function() {
	  this.gl.useProgram(this.handle)
	}

	//Destroy shader, release resources
	Shader.prototype.dispose = function() {
	  var gl = this.gl
	  gl.deleteShader(this.vertexShader)
	  gl.deleteShader(this.fragmentShader)
	  gl.deleteProgram(this.handle)
	}

	Shader.prototype.updateExports = function(uniforms, attributes) {
	  var locations = new Array(uniforms.length)
	  var program = this.handle
	  var gl = this.gl

	  var doLink = relinkUniforms.bind(void 0,
	    gl,
	    program,
	    locations,
	    uniforms
	  )
	  doLink()

	  this.types = {
	    uniforms: makeReflect(uniforms),
	    attributes: makeReflect(attributes)
	  }

	  this.attributes = createAttributeWrapper(
	    gl,
	    program,
	    attributes,
	    doLink
	  )

	  Object.defineProperty(this, 'uniforms', createUniformWrapper(
	    gl,
	    program,
	    uniforms,
	    locations
	  ))
	}

	//Relinks all uniforms
	function relinkUniforms(gl, program, locations, uniforms) {
	  for(var i=0; i<uniforms.length; ++i) {
	    locations[i] = gl.getUniformLocation(program, uniforms[i].name)
	  }
	}

	//Compiles and links a shader program with the given attribute and vertex list
	function createShader(
	    gl
	  , vertSource
	  , fragSource
	  , uniforms
	  , attributes) {
	  
	  //Compile vertex shader
	  var vertShader = gl.createShader(gl.VERTEX_SHADER)
	  gl.shaderSource(vertShader, vertSource)
	  gl.compileShader(vertShader)
	  if(!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
	    var errLog = gl.getShaderInfoLog(vertShader)
	    console.error('gl-shader: Error compling vertex shader:', errLog)
	    throw new Error('gl-shader: Error compiling vertex shader:' + errLog)
	  }
	  
	  //Compile fragment shader
	  var fragShader = gl.createShader(gl.FRAGMENT_SHADER)
	  gl.shaderSource(fragShader, fragSource)
	  gl.compileShader(fragShader)
	  if(!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
	    var errLog = gl.getShaderInfoLog(fragShader)
	    console.error('gl-shader: Error compiling fragment shader:', errLog)
	    throw new Error('gl-shader: Error compiling fragment shader:' + errLog)
	  }
	  
	  //Link program
	  var program = gl.createProgram()
	  gl.attachShader(program, fragShader)
	  gl.attachShader(program, vertShader)

	  //Optional default attriubte locations
	  attributes.forEach(function(a) {
	    if (typeof a.location === 'number') 
	      gl.bindAttribLocation(program, a.location, a.name)
	  })

	  gl.linkProgram(program)
	  if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
	    var errLog = gl.getProgramInfoLog(program)
	    console.error('gl-shader: Error linking shader program:', errLog)
	    throw new Error('gl-shader: Error linking shader program:' + errLog)
	  }
	  
	  //Return final linked shader object
	  var shader = new Shader(
	    gl,
	    program,
	    vertShader,
	    fragShader
	  )
	  shader.updateExports(uniforms, attributes)

	  return shader
	}

	module.exports = createShader


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var dup = __webpack_require__(8)
	var coallesceUniforms = __webpack_require__(9)

	module.exports = createUniformWrapper

	//Binds a function and returns a value
	function identity(x) {
	  var c = new Function('y', 'return function(){return y}')
	  return c(x)
	}

	//Create shims for uniforms
	function createUniformWrapper(gl, program, uniforms, locations) {

	  function makeGetter(index) {
	    var proc = new Function('gl', 'prog', 'locations', 
	      'return function(){return gl.getUniform(prog,locations[' + index + '])}') 
	    return proc(gl, program, locations)
	  }

	  function makePropSetter(path, index, type) {
	    switch(type) {
	      case 'bool':
	      case 'int':
	      case 'sampler2D':
	      case 'samplerCube':
	        return 'gl.uniform1i(locations[' + index + '],obj' + path + ')'
	      case 'float':
	        return 'gl.uniform1f(locations[' + index + '],obj' + path + ')'
	      default:
	        var vidx = type.indexOf('vec')
	        if(0 <= vidx && vidx <= 1 && type.length === 4 + vidx) {
	          var d = type.charCodeAt(type.length-1) - 48
	          if(d < 2 || d > 4) {
	            throw new Error('gl-shader: Invalid data type')
	          }
	          switch(type.charAt(0)) {
	            case 'b':
	            case 'i':
	              return 'gl.uniform' + d + 'iv(locations[' + index + '],obj' + path + ')'
	            case 'v':
	              return 'gl.uniform' + d + 'fv(locations[' + index + '],obj' + path + ')'
	            default:
	              throw new Error('gl-shader: Unrecognized data type for vector ' + name + ': ' + type)
	          }
	        } else if(type.indexOf('mat') === 0 && type.length === 4) {
	          var d = type.charCodeAt(type.length-1) - 48
	          if(d < 2 || d > 4) {
	            throw new Error('gl-shader: Invalid uniform dimension type for matrix ' + name + ': ' + type)
	          }
	          return 'gl.uniformMatrix' + d + 'fv(locations[' + index + '],false,obj' + path + ')'
	        } else {
	          throw new Error('gl-shader: Unknown uniform data type for ' + name + ': ' + type)
	        }
	      break
	    }
	  }

	  function enumerateIndices(prefix, type) {
	    if(typeof type !== 'object') {
	      return [ [prefix, type] ]
	    }
	    var indices = []
	    for(var id in type) {
	      var prop = type[id]
	      var tprefix = prefix
	      if(parseInt(id) + '' === id) {
	        tprefix += '[' + id + ']'
	      } else {
	        tprefix += '.' + id
	      }
	      if(typeof prop === 'object') {
	        indices.push.apply(indices, enumerateIndices(tprefix, prop))
	      } else {
	        indices.push([tprefix, prop])
	      }
	    }
	    return indices
	  }

	  function makeSetter(type) {
	    var code = [ 'return function updateProperty(obj){' ]
	    var indices = enumerateIndices('', type)
	    for(var i=0; i<indices.length; ++i) {
	      var item = indices[i]
	      var path = item[0]
	      var idx  = item[1]
	      if(locations[idx]) {
	        code.push(makePropSetter(path, idx, uniforms[idx].type))
	      }
	    }
	    code.push('return obj}')
	    var proc = new Function('gl', 'prog', 'locations', code.join('\n'))
	    return proc(gl, program, locations)
	  }

	  function defaultValue(type) {
	    switch(type) {
	      case 'bool':
	        return false
	      case 'int':
	      case 'sampler2D':
	      case 'samplerCube':
	        return 0
	      case 'float':
	        return 0.0
	      default:
	        var vidx = type.indexOf('vec')
	        if(0 <= vidx && vidx <= 1 && type.length === 4 + vidx) {
	          var d = type.charCodeAt(type.length-1) - 48
	          if(d < 2 || d > 4) {
	            throw new Error('gl-shader: Invalid data type')
	          }
	          if(type.charAt(0) === 'b') {
	            return dup(d, false)
	          }
	          return dup(d)
	        } else if(type.indexOf('mat') === 0 && type.length === 4) {
	          var d = type.charCodeAt(type.length-1) - 48
	          if(d < 2 || d > 4) {
	            throw new Error('gl-shader: Invalid uniform dimension type for matrix ' + name + ': ' + type)
	          }
	          return dup([d,d])
	        } else {
	          throw new Error('gl-shader: Unknown uniform data type for ' + name + ': ' + type)
	        }
	      break
	    }
	  }

	  function storeProperty(obj, prop, type) {
	    if(typeof type === 'object') {
	      var child = processObject(type)
	      Object.defineProperty(obj, prop, {
	        get: identity(child),
	        set: makeSetter(type),
	        enumerable: true,
	        configurable: false
	      })
	    } else {
	      if(locations[type]) {
	        Object.defineProperty(obj, prop, {
	          get: makeGetter(type),
	          set: makeSetter(type),
	          enumerable: true,
	          configurable: false
	        })
	      } else {
	        obj[prop] = defaultValue(uniforms[type].type)
	      }
	    }
	  }

	  function processObject(obj) {
	    var result
	    if(Array.isArray(obj)) {
	      result = new Array(obj.length)
	      for(var i=0; i<obj.length; ++i) {
	        storeProperty(result, i, obj[i])
	      }
	    } else {
	      result = {}
	      for(var id in obj) {
	        storeProperty(result, id, obj[id])
	      }
	    }
	    return result
	  }

	  //Return data
	  var coallesced = coallesceUniforms(uniforms, true)
	  return {
	    get: identity(processObject(coallesced)),
	    set: makeSetter(coallesced),
	    enumerable: true,
	    configurable: true
	  }
	}


/***/ },
/* 8 */
/***/ function(module, exports) {

	"use strict"

	function dupe_array(count, value, i) {
	  var c = count[i]|0
	  if(c <= 0) {
	    return []
	  }
	  var result = new Array(c), j
	  if(i === count.length-1) {
	    for(j=0; j<c; ++j) {
	      result[j] = value
	    }
	  } else {
	    for(j=0; j<c; ++j) {
	      result[j] = dupe_array(count, value, i+1)
	    }
	  }
	  return result
	}

	function dupe_number(count, value) {
	  var result, i
	  result = new Array(count)
	  for(i=0; i<count; ++i) {
	    result[i] = value
	  }
	  return result
	}

	function dupe(count, value) {
	  if(typeof value === "undefined") {
	    value = 0
	  }
	  switch(typeof count) {
	    case "number":
	      if(count > 0) {
	        return dupe_number(count|0, value)
	      }
	    break
	    case "object":
	      if(typeof (count.length) === "number") {
	        return dupe_array(count, value, 0)
	      }
	    break
	  }
	  return []
	}

	module.exports = dupe

/***/ },
/* 9 */
/***/ function(module, exports) {

	'use strict'

	module.exports = makeReflectTypes

	//Construct type info for reflection.
	//
	// This iterates over the flattened list of uniform type values and smashes them into a JSON object.
	//
	// The leaves of the resulting object are either indices or type strings representing primitive glslify types
	function makeReflectTypes(uniforms, useIndex) {
	  var obj = {}
	  for(var i=0; i<uniforms.length; ++i) {
	    var n = uniforms[i].name
	    var parts = n.split(".")
	    var o = obj
	    for(var j=0; j<parts.length; ++j) {
	      var x = parts[j].split("[")
	      if(x.length > 1) {
	        if(!(x[0] in o)) {
	          o[x[0]] = []
	        }
	        o = o[x[0]]
	        for(var k=1; k<x.length; ++k) {
	          var y = parseInt(x[k])
	          if(k<x.length-1 || j<parts.length-1) {
	            if(!(y in o)) {
	              if(k < x.length-1) {
	                o[y] = []
	              } else {
	                o[y] = {}
	              }
	            }
	            o = o[y]
	          } else {
	            if(useIndex) {
	              o[y] = i
	            } else {
	              o[y] = uniforms[i].type
	            }
	          }
	        }
	      } else if(j < parts.length-1) {
	        if(!(x[0] in o)) {
	          o[x[0]] = {}
	        }
	        o = o[x[0]]
	      } else {
	        if(useIndex) {
	          o[x[0]] = i
	        } else {
	          o[x[0]] = uniforms[i].type
	        }
	      }
	    }
	  }
	  return obj
	}

/***/ },
/* 10 */
/***/ function(module, exports) {

	'use strict'

	module.exports = createAttributeWrapper

	//Shader attribute class
	function ShaderAttribute(gl, program, location, dimension, name, constFunc, relink) {
	  this._gl = gl
	  this._program = program
	  this._location = location
	  this._dimension = dimension
	  this._name = name
	  this._constFunc = constFunc
	  this._relink = relink
	}

	var proto = ShaderAttribute.prototype

	proto.pointer = function setAttribPointer(type, normalized, stride, offset) {
	  var gl = this._gl
	  gl.vertexAttribPointer(this._location, this._dimension, type||gl.FLOAT, !!normalized, stride||0, offset||0)
	  this._gl.enableVertexAttribArray(this._location)
	}

	Object.defineProperty(proto, 'location', {
	  get: function() {
	    return this._location
	  }
	  , set: function(v) {
	    if(v !== this._location) {
	      this._location = v
	      this._gl.bindAttribLocation(this._program, v, this._name)
	      this._gl.linkProgram(this._program)
	      this._relink()
	    }
	  }
	})


	//Adds a vector attribute to obj
	function addVectorAttribute(gl, program, location, dimension, obj, name, doLink) {
	  var constFuncArgs = [ 'gl', 'v' ]
	  var varNames = []
	  for(var i=0; i<dimension; ++i) {
	    constFuncArgs.push('x'+i)
	    varNames.push('x'+i)
	  }
	  constFuncArgs.push([
	    'if(x0.length===void 0){return gl.vertexAttrib', dimension, 'f(v,', varNames.join(), ')}else{return gl.vertexAttrib', dimension, 'fv(v,x0)}'
	  ].join(''))
	  var constFunc = Function.apply(undefined, constFuncArgs)
	  var attr = new ShaderAttribute(gl, program, location, dimension, name, constFunc, doLink)
	  Object.defineProperty(obj, name, {
	    set: function(x) {
	      gl.disableVertexAttribArray(attr._location)
	      constFunc(gl, attr._location, x)
	      return x
	    }
	    , get: function() {
	      return attr
	    }
	    , enumerable: true
	  })
	}

	//Create shims for attributes
	function createAttributeWrapper(gl, program, attributes, doLink) {
	  var obj = {}
	  for(var i=0, n=attributes.length; i<n; ++i) {
	    var a = attributes[i]
	    var name = a.name
	    var type = a.type
	    var location = gl.getAttribLocation(program, name)
	    
	    switch(type) {
	      case 'bool':
	      case 'int':
	      case 'float':
	        addVectorAttribute(gl, program, location, 1, obj, name, doLink)
	      break
	      
	      default:
	        if(type.indexOf('vec') >= 0) {
	          var d = type.charCodeAt(type.length-1) - 48
	          if(d < 2 || d > 4) {
	            throw new Error('gl-shader: Invalid data type for attribute ' + name + ': ' + type)
	          }
	          addVectorAttribute(gl, program, location, d, obj, name, doLink)
	        } else {
	          throw new Error('gl-shader: Unknown data type for attribute ' + name + ': ' + type)
	        }
	      break
	    }
	  }
	  return obj
	}

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	var colorToFloat = __webpack_require__(32)
	var mixes = __webpack_require__(2)
	var premult = __webpack_require__(34)
	var WhiteTex = __webpack_require__(12)

	var vertNumFloats = __webpack_require__(35).floatsPerVertex

	//Temporary arrays to avoid GC thrashing
	var position = [0, 0],
	    shape = [0, 0],
	    texcoord = [0, 0, 0, 0],
	    color = [0, 0, 0, 0]

	var tmp4 = [0, 0, 0, 0],
	    rotOrigin = [0, 0],
	    tmp2 = [0, 0]

	function SpriteBatch(gl, opt) {
	    if (!(this instanceof SpriteBatch))
	        return new SpriteBatch(gl, opt)
	    if (!gl)
	        throw new Error("must specify gl context")
	    this.gl = gl
	    opt = opt || {}
	    
	    this._bound = false
	    this.idx = 0

	    //no transform means identity
	    this.transform = null

	    //white texture is akin to "no texture" (without switching shaders)
	    this._defaultTexture = opt.defaultTexture || WhiteTex(gl)
	    this._ownsDefault = !opt.defaultTexture
	    this._lastTexture = this._defaultTexture
	    this._texture = this._defaultTexture
	    this.texture = null

	    this.mode = typeof opt.mode === 'number' ? opt.mode : gl.TRIANGLES
	    this.premultiplied = opt.premultiplied || false

	    this._dirty = true
	    this.create(opt)

	    //set default attributes
	    this.defaults()
	}

	//mix in create() and ensureCapacity() functions
	mixes(SpriteBatch, __webpack_require__(35).mixins)

	mixes(SpriteBatch, {

	    capacity: {
	        get: function() {
	            return this._capacity
	        }
	    },

	    texture: {
	        get: function() {
	            return this._texture
	        },

	        set: function(tex) {
	            this._texture = tex || this._defaultTexture
	        }
	    },

	    dispose: function() {
	        if (this.vertexBuffer)
	            this.vertexBuffer.dispose()
	        if (this.indexBuffer)
	            this.indexBuffer.dispose()
	        if (this.vao)
	            this.vao.dispose()
	        if (this._ownsDefault)
	            this._defaultTexture.dispose()
	    },

	    clear: function() {
	        this.idx = 0
	        return this
	    },

	    bind: function(shader) {
	        shader.bind()
	        this.vao.bind(shader)
	        this._bound = true
	    },

	    unbind: function() {
	        this.vao.unbind()
	        this._bound = false
	    },

	    defaults: function() {
	        this.position = copy2(position, 0, 0)
	        this.texcoord = copy4(texcoord, 0, 0, 1, 1)
	        this.color = copy4(color, 1, 1, 1, 1)
	        this.shape = copy2(shape, 0, 0)
	        return this
	    },

	    push: function(sprite) {
	        //if we are defining attributes on the fly
	        if (sprite) {
	            this.texture = sprite.texture
	            this.position = sprite.position || copy2(position, 0, 0)
	            this.texcoord = sprite.texcoord || copy4(texcoord, 0, 0, 1, 1)
	            this.color = sprite.color || copy4(color, 1, 1, 1, 1)
	            this.shape = sprite.shape || copy2(shape, 0, 0)
	        }

	        if (this.texture !== this._lastTexture) {
	            //new texture, flush previous data
	            if (this._bound)
	                this.flush()
	            this._lastTexture = this.texture
	        } else if (this.idx === this.vertices.length) {
	            //if we AREN'T bound, we need to stop pushing vertex data!
	            if (!this._bound)
	                return this

	            //if we ARE bound, we can flush the batch and continue drawing
	            this.flush()
	        }

	        this._dirty = true

	        //get RGBA components and pack into a single float
	        var colorRGBA = this.premultiplied ? premult(this.color, tmp4) : this.color
	        var c = colorToFloat(colorRGBA)

	        var u1 = this.texcoord[0],
	            v1 = this.texcoord[1],
	            u2 = this.texcoord[2],
	            v2 = this.texcoord[3]

	        var x = this.position[0],
	            y = this.position[1],
	            width = this.shape[0],
	            height = this.shape[1]

	        this._vert(x, y, u1, v1, c)
	        this._vert(x+width, y, u2, v1, c)
	        this._vert(x+width, y+height, u2, v2, c)
	        this._vert(x, y+height, u1, v2, c)
	        
	        return this
	    },

	    _vert: function(x1, y1, u1, v1, c) {
	        var idx = this.idx,
	            verts = this.vertices,
	            transform = this.transform

	        if (transform) {
	            var x = x1, y = y1
	            x1 = transform[0] * x + transform[4] * y + transform[12]
	            y1 = transform[1] * x + transform[5] * y + transform[13]
	        }

	        //xy
	        verts[idx++] = x1
	        verts[idx++] = y1
	        //uv
	        verts[idx++] = u1
	        verts[idx++] = v1
	        //color
	        verts[idx++] = c
	        this.idx = idx
	    },

	    flush: function() {
	        this.draw()
	        return this.clear()
	    },

	    draw: function() {
	        //If we've reached a new texture or capacity
	        //while not bound, then we will just clear the batch
	        //to zero and draw nothing
	        if (this.idx === 0 || !this._bound)
	            return this

	        var gl = this.gl
	        
	        if (this._dirty) {
	            var view = this.vertices.subarray(0, this.idx)
	            this.vertexBuffer.update(view, 0)
	            this._dirty = false
	        }

	        if (this._lastTexture)
	            this._lastTexture.bind()
	        this._lastTexture = this.texture

	        var sprites = (this.idx / (vertNumFloats * 4))
	        if (sprites > 0)
	            this.vao.draw(this.mode, sprites * 6, 0)
	        return this
	    },
	})

	module.exports = SpriteBatch

	//TODO: will use modular gl-matrix for these...
	function copy2(out, x, y) {
	    out[0] = x
	    out[1] = y
	    return out
	}

	function copy4(out, x, y, z, w) {
	    out[0] = x
	    out[1] = y
	    out[2] = z
	    out[3] = w
	    return out
	}

	function copyVec2(out, vec) {
	    return copy2(out, vec[0], vec[1])
	}

	function transformMat4(out, a, m) {
	    var x = a[0], 
	        y = a[1]
	    out[0] = m[0] * x + m[4] * y + m[12]
	    out[1] = m[1] * x + m[5] * y + m[13]
	    return out
	}

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	var create = __webpack_require__(13)
	var ndarray = __webpack_require__(29)

	module.exports = function(gl) {
	    //fill an array with 0xff
	    var data = Array.apply(null, new Array(16))
	            .map(Number.prototype.valueOf, 0xFF);
	    //create a 2D ndarray
	    var array = ndarray(new Uint8Array(data), [2, 2, 4])
	    return create(gl, array)
	}

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	var ndarray = __webpack_require__(14)
	var ops     = __webpack_require__(17)
	var pool    = __webpack_require__(22)

	module.exports = createTexture2D

	var linearTypes = null
	var filterTypes = null
	var wrapTypes   = null

	function lazyInitLinearTypes(gl) {
	  linearTypes = [
	    gl.LINEAR,
	    gl.NEAREST_MIPMAP_LINEAR,
	    gl.LINEAR_MIPMAP_NEAREST,
	    gl.LINEAR_MIPMAP_NEAREST
	  ]
	  filterTypes = [
	    gl.NEAREST,
	    gl.LINEAR,
	    gl.NEAREST_MIPMAP_NEAREST,
	    gl.NEAREST_MIPMAP_LINEAR,
	    gl.LINEAR_MIPMAP_NEAREST,
	    gl.LINEAR_MIPMAP_LINEAR
	  ]
	  wrapTypes = [
	    gl.REPEAT,
	    gl.CLAMP_TO_EDGE,
	    gl.MIRRORED_REPEAT
	  ]
	}

	var convertFloatToUint8 = function(out, inp) {
	  ops.muls(out, inp, 255.0)
	}

	function reshapeTexture(tex, w, h) {
	  var gl = tex.gl
	  var maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
	  if(w < 0 || w > maxSize || h < 0 || h > maxSize) {
	    throw new Error('gl-texture2d: Invalid texture size')
	  }
	  tex._shape = [w, h]
	  tex.bind()
	  gl.texImage2D(gl.TEXTURE_2D, 0, tex.format, w, h, 0, tex.format, tex.type, null)
	  tex._mipLevels = [0]
	  return tex
	}

	function Texture2D(gl, handle, width, height, format, type) {
	  this.gl = gl
	  this.handle = handle
	  this.format = format
	  this.type = type
	  this._shape = [width, height]
	  this._mipLevels = [0]
	  this._magFilter = gl.NEAREST
	  this._minFilter = gl.NEAREST
	  this._wrapS = gl.CLAMP_TO_EDGE
	  this._wrapT = gl.CLAMP_TO_EDGE
	  this._anisoSamples = 1

	  var parent = this
	  var wrapVector = [this._wrapS, this._wrapT]
	  Object.defineProperties(wrapVector, [
	    {
	      get: function() {
	        return parent._wrapS
	      },
	      set: function(v) {
	        return parent.wrapS = v
	      }
	    },
	    {
	      get: function() {
	        return parent._wrapT
	      },
	      set: function(v) {
	        return parent.wrapT = v
	      }
	    }
	  ])
	  this._wrapVector = wrapVector

	  var shapeVector = [this._shape[0], this._shape[1]]
	  Object.defineProperties(shapeVector, [
	    {
	      get: function() {
	        return parent._shape[0]
	      },
	      set: function(v) {
	        return parent.width = v
	      }
	    },
	    {
	      get: function() {
	        return parent._shape[1]
	      },
	      set: function(v) {
	        return parent.height = v
	      }
	    }
	  ])
	  this._shapeVector = shapeVector
	}

	var proto = Texture2D.prototype

	Object.defineProperties(proto, {
	  minFilter: {
	    get: function() {
	      return this._minFilter
	    },
	    set: function(v) {
	      this.bind()
	      var gl = this.gl
	      if(this.type === gl.FLOAT && linearTypes.indexOf(v) >= 0) {
	        if(!gl.getExtension('OES_texture_float_linear')) {
	          v = gl.NEAREST
	        }
	      }
	      if(filterTypes.indexOf(v) < 0) {
	        throw new Error('gl-texture2d: Unknown filter mode ' + v)
	      }
	      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, v)
	      return this._minFilter = v
	    }
	  },
	  magFilter: {
	    get: function() {
	      return this._magFilter
	    },
	    set: function(v) {
	      this.bind()
	      var gl = this.gl
	      if(this.type === gl.FLOAT && linearTypes.indexOf(v) >= 0) {
	        if(!gl.getExtension('OES_texture_float_linear')) {
	          v = gl.NEAREST
	        }
	      }
	      if(filterTypes.indexOf(v) < 0) {
	        throw new Error('gl-texture2d: Unknown filter mode ' + v)
	      }
	      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, v)
	      return this._magFilter = v
	    }
	  },
	  mipSamples: {
	    get: function() {
	      return this._anisoSamples
	    },
	    set: function(i) {
	      var psamples = this._anisoSamples
	      this._anisoSamples = Math.max(i, 1)|0
	      if(psamples !== this._anisoSamples) {
	        var ext = gl.getExtension('EXT_texture_filter_anisotropic')
	        if(ext) {
	          this.gl.texParameterf(this.gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, this._anisoSamples)
	        }
	      }
	      return this._anisoSamples
	    }
	  },
	  wrapS: {
	    get: function() {
	      return this._wrapS
	    },
	    set: function(v) {
	      this.bind()
	      if(wrapTypes.indexOf(v) < 0) {
	        throw new Error('gl-texture2d: Unknown wrap mode ' + v)
	      }
	      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, v)
	      return this._wrapS = v
	    }
	  },
	  wrapT: {
	    get: function() {
	      return this._wrapT
	    },
	    set: function(v) {
	      this.bind()
	      if(wrapTypes.indexOf(v) < 0) {
	        throw new Error('gl-texture2d: Unknown wrap mode ' + v)
	      }
	      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, v)
	      return this._wrapT = v
	    }
	  },
	  wrap: {
	    get: function() {
	      return this._wrapVector
	    },
	    set: function(v) {
	      if(!Array.isArray(v)) {
	        v = [v,v]
	      }
	      if(v.length !== 2) {
	        throw new Error('gl-texture2d: Must specify wrap mode for rows and columns')
	      }
	      for(var i=0; i<2; ++i) {
	        if(wrapTypes.indexOf(v[i]) < 0) {
	          throw new Error('gl-texture2d: Unknown wrap mode ' + v)
	        }
	      }
	      this._wrapS = v[0]
	      this._wrapT = v[1]

	      var gl = this.gl
	      this.bind()
	      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this._wrapS)
	      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this._wrapT)

	      return v
	    }
	  },
	  shape: {
	    get: function() {
	      return this._shapeVector
	    },
	    set: function(x) {
	      if(!Array.isArray(x)) {
	        x = [x|0,x|0]
	      } else {
	        if(x.length !== 2) {
	          throw new Error('gl-texture2d: Invalid texture shape')
	        }
	      }
	      reshapeTexture(this, x[0]|0, x[1]|0)
	      return [x[0]|0, x[1]|0]
	    }
	  },
	  width: {
	    get: function() {
	      return this._shape[0]
	    },
	    set: function(w) {
	      w = w|0
	      reshapeTexture(this, w, this._shape[1])
	      return w
	    }
	  },
	  height: {
	    get: function() {
	      return this._shape[1]
	    },
	    set: function(h) {
	      h = h|0
	      reshapeTexture(this, this._shape[0], h)
	      return h
	    }
	  }
	})

	proto.bind = function(unit) {
	  var gl = this.gl
	  if(unit !== undefined) {
	    gl.activeTexture(gl.TEXTURE0 + (unit|0))
	  }
	  gl.bindTexture(gl.TEXTURE_2D, this.handle)
	  if(unit !== undefined) {
	    return (unit|0)
	  }
	  return gl.getParameter(gl.ACTIVE_TEXTURE) - gl.TEXTURE0
	}

	proto.dispose = function() {
	  this.gl.deleteTexture(this.handle)
	}

	proto.generateMipmap = function() {
	  this.bind()
	  this.gl.generateMipmap(this.gl.TEXTURE_2D)

	  //Update mip levels
	  var l = Math.min(this._shape[0], this._shape[1])
	  for(var i=0; l>0; ++i, l>>>=1) {
	    if(this._mipLevels.indexOf(i) < 0) {
	      this._mipLevels.push(i)
	    }
	  }
	}

	proto.setPixels = function(data, x_off, y_off, mip_level) {
	  var gl = this.gl
	  this.bind()
	  if(Array.isArray(x_off)) {
	    mip_level = y_off
	    y_off = x_off[1]|0
	    x_off = x_off[0]|0
	  } else {
	    x_off = x_off || 0
	    y_off = y_off || 0
	  }
	  mip_level = mip_level || 0
	  if(data instanceof HTMLCanvasElement ||
	     data instanceof ImageData ||
	     data instanceof HTMLImageElement ||
	     data instanceof HTMLVideoElement) {
	    var needsMip = this._mipLevels.indexOf(mip_level) < 0
	    if(needsMip) {
	      gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.format, this.type, data)
	      this._mipLevels.push(mip_level)
	    } else {
	      gl.texSubImage2D(gl.TEXTURE_2D, mip_level, x_off, y_off, this.format, this.type, data)
	    }
	  } else if(data.shape && data.stride && data.data) {
	    if(data.shape.length < 2 ||
	       x_off + data.shape[1] > this._shape[1]>>>mip_level ||
	       y_off + data.shape[0] > this._shape[0]>>>mip_level ||
	       x_off < 0 ||
	       y_off < 0) {
	      throw new Error('gl-texture2d: Texture dimensions are out of bounds')
	    }
	    texSubImageArray(gl, x_off, y_off, mip_level, this.format, this.type, this._mipLevels, data)
	  } else {
	    throw new Error('gl-texture2d: Unsupported data type')
	  }
	}


	function isPacked(shape, stride) {
	  if(shape.length === 3) {
	    return  (stride[2] === 1) &&
	            (stride[1] === shape[0]*shape[2]) &&
	            (stride[0] === shape[2])
	  }
	  return  (stride[0] === 1) &&
	          (stride[1] === shape[0])
	}

	function texSubImageArray(gl, x_off, y_off, mip_level, cformat, ctype, mipLevels, array) {
	  var dtype = array.dtype
	  var shape = array.shape.slice()
	  if(shape.length < 2 || shape.length > 3) {
	    throw new Error('gl-texture2d: Invalid ndarray, must be 2d or 3d')
	  }
	  var type = 0, format = 0
	  var packed = isPacked(shape, array.stride.slice())
	  if(dtype === 'float32') {
	    type = gl.FLOAT
	  } else if(dtype === 'float64') {
	    type = gl.FLOAT
	    packed = false
	    dtype = 'float32'
	  } else if(dtype === 'uint8') {
	    type = gl.UNSIGNED_BYTE
	  } else {
	    type = gl.UNSIGNED_BYTE
	    packed = false
	    dtype = 'uint8'
	  }
	  var channels = 1
	  if(shape.length === 2) {
	    format = gl.LUMINANCE
	    shape = [shape[0], shape[1], 1]
	    array = ndarray(array.data, shape, [array.stride[0], array.stride[1], 1], array.offset)
	  } else if(shape.length === 3) {
	    if(shape[2] === 1) {
	      format = gl.ALPHA
	    } else if(shape[2] === 2) {
	      format = gl.LUMINANCE_ALPHA
	    } else if(shape[2] === 3) {
	      format = gl.RGB
	    } else if(shape[2] === 4) {
	      format = gl.RGBA
	    } else {
	      throw new Error('gl-texture2d: Invalid shape for pixel coords')
	    }
	    channels = shape[2]
	  } else {
	    throw new Error('gl-texture2d: Invalid shape for texture')
	  }
	  //For 1-channel textures allow conversion between formats
	  if((format  === gl.LUMINANCE || format  === gl.ALPHA) &&
	     (cformat === gl.LUMINANCE || cformat === gl.ALPHA)) {
	    format = cformat
	  }
	  if(format !== cformat) {
	    throw new Error('gl-texture2d: Incompatible texture format for setPixels')
	  }
	  var size = array.size
	  var needsMip = mipLevels.indexOf(mip_level) < 0
	  if(needsMip) {
	    mipLevels.push(mip_level)
	  }
	  if(type === ctype && packed) {
	    //Array data types are compatible, can directly copy into texture
	    if(array.offset === 0 && array.data.length === size) {
	      if(needsMip) {
	        gl.texImage2D(gl.TEXTURE_2D, mip_level, cformat, shape[0], shape[1], 0, cformat, ctype, array.data)
	      } else {
	        gl.texSubImage2D(gl.TEXTURE_2D, mip_level, x_off, y_off, shape[0], shape[1], cformat, ctype, array.data)
	      }
	    } else {
	      if(needsMip) {
	        gl.texImage2D(gl.TEXTURE_2D, mip_level, cformat, shape[0], shape[1], 0, cformat, ctype, array.data.subarray(array.offset, array.offset+size))
	      } else {
	        gl.texSubImage2D(gl.TEXTURE_2D, mip_level, x_off, y_off, shape[0], shape[1], cformat, ctype, array.data.subarray(array.offset, array.offset+size))
	      }
	    }
	  } else {
	    //Need to do type conversion to pack data into buffer
	    var pack_buffer
	    if(ctype === gl.FLOAT) {
	      pack_buffer = pool.mallocFloat32(size)
	    } else {
	      pack_buffer = pool.mallocUint8(size)
	    }
	    var pack_view = ndarray(pack_buffer, shape, [shape[2], shape[2]*shape[0], 1])
	    if(type === gl.FLOAT && ctype === gl.UNSIGNED_BYTE) {
	      convertFloatToUint8(pack_view, array)
	    } else {
	      ops.assign(pack_view, array)
	    }
	    if(needsMip) {
	      gl.texImage2D(gl.TEXTURE_2D, mip_level, cformat, shape[0], shape[1], 0, cformat, ctype, pack_buffer.subarray(0, size))
	    } else {
	      gl.texSubImage2D(gl.TEXTURE_2D, mip_level, x_off, y_off, shape[0], shape[1], cformat, ctype, pack_buffer.subarray(0, size))
	    }
	    if(ctype === gl.FLOAT) {
	      pool.freeFloat32(pack_buffer)
	    } else {
	      pool.freeUint8(pack_buffer)
	    }
	  }
	}

	function initTexture(gl) {
	  var tex = gl.createTexture()
	  gl.bindTexture(gl.TEXTURE_2D, tex)
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
	  return tex
	}

	function createTextureShape(gl, width, height, format, type) {
	  var maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
	  if(width < 0 || width > maxTextureSize || height < 0 || height  > maxTextureSize) {
	    throw new Error('gl-texture2d: Invalid texture shape')
	  }
	  if(type === gl.FLOAT && !gl.getExtension('OES_texture_float')) {
	    throw new Error('gl-texture2d: Floating point textures not supported on this platform')
	  }
	  var tex = initTexture(gl)
	  gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, type, null)
	  return new Texture2D(gl, tex, width, height, format, type)
	}

	function createTextureDOM(gl, element, format, type) {
	  var tex = initTexture(gl)
	  gl.texImage2D(gl.TEXTURE_2D, 0, format, format, type, element)
	  return new Texture2D(gl, tex, element.width|0, element.height|0, format, type)
	}

	//Creates a texture from an ndarray
	function createTextureArray(gl, array) {
	  var dtype = array.dtype
	  var shape = array.shape.slice()
	  var maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
	  if(shape[0] < 0 || shape[0] > maxSize || shape[1] < 0 || shape[1] > maxSize) {
	    throw new Error('gl-texture2d: Invalid texture size')
	  }
	  var packed = isPacked(shape, array.stride.slice())
	  var type = 0
	  if(dtype === 'float32') {
	    type = gl.FLOAT
	  } else if(dtype === 'float64') {
	    type = gl.FLOAT
	    packed = false
	    dtype = 'float32'
	  } else if(dtype === 'uint8') {
	    type = gl.UNSIGNED_BYTE
	  } else {
	    type = gl.UNSIGNED_BYTE
	    packed = false
	    dtype = 'uint8'
	  }
	  var format = 0
	  if(shape.length === 2) {
	    format = gl.LUMINANCE
	    shape = [shape[0], shape[1], 1]
	    array = ndarray(array.data, shape, [array.stride[0], array.stride[1], 1], array.offset)
	  } else if(shape.length === 3) {
	    if(shape[2] === 1) {
	      format = gl.ALPHA
	    } else if(shape[2] === 2) {
	      format = gl.LUMINANCE_ALPHA
	    } else if(shape[2] === 3) {
	      format = gl.RGB
	    } else if(shape[2] === 4) {
	      format = gl.RGBA
	    } else {
	      throw new Error('gl-texture2d: Invalid shape for pixel coords')
	    }
	  } else {
	    throw new Error('gl-texture2d: Invalid shape for texture')
	  }
	  if(type === gl.FLOAT && !gl.getExtension('OES_texture_float')) {
	    type = gl.UNSIGNED_BYTE
	    packed = false
	  }
	  var buffer, buf_store
	  var size = array.size
	  if(!packed) {
	    var stride = [shape[2], shape[2]*shape[0], 1]
	    buf_store = pool.malloc(size, dtype)
	    var buf_array = ndarray(buf_store, shape, stride, 0)
	    if((dtype === 'float32' || dtype === 'float64') && type === gl.UNSIGNED_BYTE) {
	      convertFloatToUint8(buf_array, array)
	    } else {
	      ops.assign(buf_array, array)
	    }
	    buffer = buf_store.subarray(0, size)
	  } else if (array.offset === 0 && array.data.length === size) {
	    buffer = array.data
	  } else {
	    buffer = array.data.subarray(array.offset, array.offset + size)
	  }
	  var tex = initTexture(gl)
	  gl.texImage2D(gl.TEXTURE_2D, 0, format, shape[0], shape[1], 0, format, type, buffer)
	  if(!packed) {
	    pool.free(buf_store)
	  }
	  return new Texture2D(gl, tex, shape[0], shape[1], format, type)
	}

	function createTexture2D(gl) {
	  if(arguments.length <= 1) {
	    throw new Error('gl-texture2d: Missing arguments for texture2d constructor')
	  }
	  if(!linearTypes) {
	    lazyInitLinearTypes(gl)
	  }
	  if(typeof arguments[1] === 'number') {
	    return createTextureShape(gl, arguments[1], arguments[2], arguments[3]||gl.RGBA, arguments[4]||gl.UNSIGNED_BYTE)
	  }
	  if(Array.isArray(arguments[1])) {
	    return createTextureShape(gl, arguments[1][0]|0, arguments[1][1]|0, arguments[2]||gl.RGBA, arguments[3]||gl.UNSIGNED_BYTE)
	  }
	  if(typeof arguments[1] === 'object') {
	    var obj = arguments[1]
	    if(obj instanceof HTMLCanvasElement ||
	       obj instanceof HTMLImageElement ||
	       obj instanceof HTMLVideoElement ||
	       obj instanceof ImageData) {
	      return createTextureDOM(gl, obj, arguments[2]||gl.RGBA, arguments[3]||gl.UNSIGNED_BYTE)
	    } else if(obj.shape && obj.data && obj.stride) {
	      return createTextureArray(gl, obj)
	    }
	  }
	  throw new Error('gl-texture2d: Invalid arguments for texture2d constructor')
	}


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	var iota = __webpack_require__(15)
	var isBuffer = __webpack_require__(16)

	var hasTypedArrays  = ((typeof Float64Array) !== "undefined")

	function compare1st(a, b) {
	  return a[0] - b[0]
	}

	function order() {
	  var stride = this.stride
	  var terms = new Array(stride.length)
	  var i
	  for(i=0; i<terms.length; ++i) {
	    terms[i] = [Math.abs(stride[i]), i]
	  }
	  terms.sort(compare1st)
	  var result = new Array(terms.length)
	  for(i=0; i<result.length; ++i) {
	    result[i] = terms[i][1]
	  }
	  return result
	}

	function compileConstructor(dtype, dimension) {
	  var className = ["View", dimension, "d", dtype].join("")
	  if(dimension < 0) {
	    className = "View_Nil" + dtype
	  }
	  var useGetters = (dtype === "generic")

	  if(dimension === -1) {
	    //Special case for trivial arrays
	    var code =
	      "function "+className+"(a){this.data=a;};\
	var proto="+className+".prototype;\
	proto.dtype='"+dtype+"';\
	proto.index=function(){return -1};\
	proto.size=0;\
	proto.dimension=-1;\
	proto.shape=proto.stride=proto.order=[];\
	proto.lo=proto.hi=proto.transpose=proto.step=\
	function(){return new "+className+"(this.data);};\
	proto.get=proto.set=function(){};\
	proto.pick=function(){return null};\
	return function construct_"+className+"(a){return new "+className+"(a);}"
	    var procedure = new Function(code)
	    return procedure()
	  } else if(dimension === 0) {
	    //Special case for 0d arrays
	    var code =
	      "function "+className+"(a,d) {\
	this.data = a;\
	this.offset = d\
	};\
	var proto="+className+".prototype;\
	proto.dtype='"+dtype+"';\
	proto.index=function(){return this.offset};\
	proto.dimension=0;\
	proto.size=1;\
	proto.shape=\
	proto.stride=\
	proto.order=[];\
	proto.lo=\
	proto.hi=\
	proto.transpose=\
	proto.step=function "+className+"_copy() {\
	return new "+className+"(this.data,this.offset)\
	};\
	proto.pick=function "+className+"_pick(){\
	return TrivialArray(this.data);\
	};\
	proto.valueOf=proto.get=function "+className+"_get(){\
	return "+(useGetters ? "this.data.get(this.offset)" : "this.data[this.offset]")+
	"};\
	proto.set=function "+className+"_set(v){\
	return "+(useGetters ? "this.data.set(this.offset,v)" : "this.data[this.offset]=v")+"\
	};\
	return function construct_"+className+"(a,b,c,d){return new "+className+"(a,d)}"
	    var procedure = new Function("TrivialArray", code)
	    return procedure(CACHED_CONSTRUCTORS[dtype][0])
	  }

	  var code = ["'use strict'"]

	  //Create constructor for view
	  var indices = iota(dimension)
	  var args = indices.map(function(i) { return "i"+i })
	  var index_str = "this.offset+" + indices.map(function(i) {
	        return "this.stride[" + i + "]*i" + i
	      }).join("+")
	  var shapeArg = indices.map(function(i) {
	      return "b"+i
	    }).join(",")
	  var strideArg = indices.map(function(i) {
	      return "c"+i
	    }).join(",")
	  code.push(
	    "function "+className+"(a," + shapeArg + "," + strideArg + ",d){this.data=a",
	      "this.shape=[" + shapeArg + "]",
	      "this.stride=[" + strideArg + "]",
	      "this.offset=d|0}",
	    "var proto="+className+".prototype",
	    "proto.dtype='"+dtype+"'",
	    "proto.dimension="+dimension)

	  //view.size:
	  code.push("Object.defineProperty(proto,'size',{get:function "+className+"_size(){\
	return "+indices.map(function(i) { return "this.shape["+i+"]" }).join("*"),
	"}})")

	  //view.order:
	  if(dimension === 1) {
	    code.push("proto.order=[0]")
	  } else {
	    code.push("Object.defineProperty(proto,'order',{get:")
	    if(dimension < 4) {
	      code.push("function "+className+"_order(){")
	      if(dimension === 2) {
	        code.push("return (Math.abs(this.stride[0])>Math.abs(this.stride[1]))?[1,0]:[0,1]}})")
	      } else if(dimension === 3) {
	        code.push(
	"var s0=Math.abs(this.stride[0]),s1=Math.abs(this.stride[1]),s2=Math.abs(this.stride[2]);\
	if(s0>s1){\
	if(s1>s2){\
	return [2,1,0];\
	}else if(s0>s2){\
	return [1,2,0];\
	}else{\
	return [1,0,2];\
	}\
	}else if(s0>s2){\
	return [2,0,1];\
	}else if(s2>s1){\
	return [0,1,2];\
	}else{\
	return [0,2,1];\
	}}})")
	      }
	    } else {
	      code.push("ORDER})")
	    }
	  }

	  //view.set(i0, ..., v):
	  code.push(
	"proto.set=function "+className+"_set("+args.join(",")+",v){")
	  if(useGetters) {
	    code.push("return this.data.set("+index_str+",v)}")
	  } else {
	    code.push("return this.data["+index_str+"]=v}")
	  }

	  //view.get(i0, ...):
	  code.push("proto.get=function "+className+"_get("+args.join(",")+"){")
	  if(useGetters) {
	    code.push("return this.data.get("+index_str+")}")
	  } else {
	    code.push("return this.data["+index_str+"]}")
	  }

	  //view.index:
	  code.push(
	    "proto.index=function "+className+"_index(", args.join(), "){return "+index_str+"}")

	  //view.hi():
	  code.push("proto.hi=function "+className+"_hi("+args.join(",")+"){return new "+className+"(this.data,"+
	    indices.map(function(i) {
	      return ["(typeof i",i,"!=='number'||i",i,"<0)?this.shape[", i, "]:i", i,"|0"].join("")
	    }).join(",")+","+
	    indices.map(function(i) {
	      return "this.stride["+i + "]"
	    }).join(",")+",this.offset)}")

	  //view.lo():
	  var a_vars = indices.map(function(i) { return "a"+i+"=this.shape["+i+"]" })
	  var c_vars = indices.map(function(i) { return "c"+i+"=this.stride["+i+"]" })
	  code.push("proto.lo=function "+className+"_lo("+args.join(",")+"){var b=this.offset,d=0,"+a_vars.join(",")+","+c_vars.join(","))
	  for(var i=0; i<dimension; ++i) {
	    code.push(
	"if(typeof i"+i+"==='number'&&i"+i+">=0){\
	d=i"+i+"|0;\
	b+=c"+i+"*d;\
	a"+i+"-=d}")
	  }
	  code.push("return new "+className+"(this.data,"+
	    indices.map(function(i) {
	      return "a"+i
	    }).join(",")+","+
	    indices.map(function(i) {
	      return "c"+i
	    }).join(",")+",b)}")

	  //view.step():
	  code.push("proto.step=function "+className+"_step("+args.join(",")+"){var "+
	    indices.map(function(i) {
	      return "a"+i+"=this.shape["+i+"]"
	    }).join(",")+","+
	    indices.map(function(i) {
	      return "b"+i+"=this.stride["+i+"]"
	    }).join(",")+",c=this.offset,d=0,ceil=Math.ceil")
	  for(var i=0; i<dimension; ++i) {
	    code.push(
	"if(typeof i"+i+"==='number'){\
	d=i"+i+"|0;\
	if(d<0){\
	c+=b"+i+"*(a"+i+"-1);\
	a"+i+"=ceil(-a"+i+"/d)\
	}else{\
	a"+i+"=ceil(a"+i+"/d)\
	}\
	b"+i+"*=d\
	}")
	  }
	  code.push("return new "+className+"(this.data,"+
	    indices.map(function(i) {
	      return "a" + i
	    }).join(",")+","+
	    indices.map(function(i) {
	      return "b" + i
	    }).join(",")+",c)}")

	  //view.transpose():
	  var tShape = new Array(dimension)
	  var tStride = new Array(dimension)
	  for(var i=0; i<dimension; ++i) {
	    tShape[i] = "a[i"+i+"]"
	    tStride[i] = "b[i"+i+"]"
	  }
	  code.push("proto.transpose=function "+className+"_transpose("+args+"){"+
	    args.map(function(n,idx) { return n + "=(" + n + "===undefined?" + idx + ":" + n + "|0)"}).join(";"),
	    "var a=this.shape,b=this.stride;return new "+className+"(this.data,"+tShape.join(",")+","+tStride.join(",")+",this.offset)}")

	  //view.pick():
	  code.push("proto.pick=function "+className+"_pick("+args+"){var a=[],b=[],c=this.offset")
	  for(var i=0; i<dimension; ++i) {
	    code.push("if(typeof i"+i+"==='number'&&i"+i+">=0){c=(c+this.stride["+i+"]*i"+i+")|0}else{a.push(this.shape["+i+"]);b.push(this.stride["+i+"])}")
	  }
	  code.push("var ctor=CTOR_LIST[a.length+1];return ctor(this.data,a,b,c)}")

	  //Add return statement
	  code.push("return function construct_"+className+"(data,shape,stride,offset){return new "+className+"(data,"+
	    indices.map(function(i) {
	      return "shape["+i+"]"
	    }).join(",")+","+
	    indices.map(function(i) {
	      return "stride["+i+"]"
	    }).join(",")+",offset)}")

	  //Compile procedure
	  var procedure = new Function("CTOR_LIST", "ORDER", code.join("\n"))
	  return procedure(CACHED_CONSTRUCTORS[dtype], order)
	}

	function arrayDType(data) {
	  if(isBuffer(data)) {
	    return "buffer"
	  }
	  if(hasTypedArrays) {
	    switch(Object.prototype.toString.call(data)) {
	      case "[object Float64Array]":
	        return "float64"
	      case "[object Float32Array]":
	        return "float32"
	      case "[object Int8Array]":
	        return "int8"
	      case "[object Int16Array]":
	        return "int16"
	      case "[object Int32Array]":
	        return "int32"
	      case "[object Uint8Array]":
	        return "uint8"
	      case "[object Uint16Array]":
	        return "uint16"
	      case "[object Uint32Array]":
	        return "uint32"
	      case "[object Uint8ClampedArray]":
	        return "uint8_clamped"
	    }
	  }
	  if(Array.isArray(data)) {
	    return "array"
	  }
	  return "generic"
	}

	var CACHED_CONSTRUCTORS = {
	  "float32":[],
	  "float64":[],
	  "int8":[],
	  "int16":[],
	  "int32":[],
	  "uint8":[],
	  "uint16":[],
	  "uint32":[],
	  "array":[],
	  "uint8_clamped":[],
	  "buffer":[],
	  "generic":[]
	}

	;(function() {
	  for(var id in CACHED_CONSTRUCTORS) {
	    CACHED_CONSTRUCTORS[id].push(compileConstructor(id, -1))
	  }
	});

	function wrappedNDArrayCtor(data, shape, stride, offset) {
	  if(data === undefined) {
	    var ctor = CACHED_CONSTRUCTORS.array[0]
	    return ctor([])
	  } else if(typeof data === "number") {
	    data = [data]
	  }
	  if(shape === undefined) {
	    shape = [ data.length ]
	  }
	  var d = shape.length
	  if(stride === undefined) {
	    stride = new Array(d)
	    for(var i=d-1, sz=1; i>=0; --i) {
	      stride[i] = sz
	      sz *= shape[i]
	    }
	  }
	  if(offset === undefined) {
	    offset = 0
	    for(var i=0; i<d; ++i) {
	      if(stride[i] < 0) {
	        offset -= (shape[i]-1)*stride[i]
	      }
	    }
	  }
	  var dtype = arrayDType(data)
	  var ctor_list = CACHED_CONSTRUCTORS[dtype]
	  while(ctor_list.length <= d+1) {
	    ctor_list.push(compileConstructor(dtype, ctor_list.length-1))
	  }
	  var ctor = ctor_list[d+1]
	  return ctor(data, shape, stride, offset)
	}

	module.exports = wrappedNDArrayCtor


/***/ },
/* 15 */
/***/ function(module, exports) {

	"use strict"

	function iota(n) {
	  var result = new Array(n)
	  for(var i=0; i<n; ++i) {
	    result[i] = i
	  }
	  return result
	}

	module.exports = iota

/***/ },
/* 16 */
/***/ function(module, exports) {

	/**
	 * Determine if an object is Buffer
	 *
	 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * License:  MIT
	 *
	 * `npm install is-buffer`
	 */

	module.exports = function (obj) {
	  return !!(
	    obj != null &&
	    obj.constructor &&
	    typeof obj.constructor.isBuffer === 'function' &&
	    obj.constructor.isBuffer(obj)
	  )
	}


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	"use strict"

	var compile = __webpack_require__(18)

	var EmptyProc = {
	  body: "",
	  args: [],
	  thisVars: [],
	  localVars: []
	}

	function fixup(x) {
	  if(!x) {
	    return EmptyProc
	  }
	  for(var i=0; i<x.args.length; ++i) {
	    var a = x.args[i]
	    if(i === 0) {
	      x.args[i] = {name: a, lvalue:true, rvalue: !!x.rvalue, count:x.count||1 }
	    } else {
	      x.args[i] = {name: a, lvalue:false, rvalue:true, count: 1}
	    }
	  }
	  if(!x.thisVars) {
	    x.thisVars = []
	  }
	  if(!x.localVars) {
	    x.localVars = []
	  }
	  return x
	}

	function pcompile(user_args) {
	  return compile({
	    args:     user_args.args,
	    pre:      fixup(user_args.pre),
	    body:     fixup(user_args.body),
	    post:     fixup(user_args.proc),
	    funcName: user_args.funcName
	  })
	}

	function makeOp(user_args) {
	  var args = []
	  for(var i=0; i<user_args.args.length; ++i) {
	    args.push("a"+i)
	  }
	  var wrapper = new Function("P", [
	    "return function ", user_args.funcName, "_ndarrayops(", args.join(","), ") {P(", args.join(","), ");return a0}"
	  ].join(""))
	  return wrapper(pcompile(user_args))
	}

	var assign_ops = {
	  add:  "+",
	  sub:  "-",
	  mul:  "*",
	  div:  "/",
	  mod:  "%",
	  band: "&",
	  bor:  "|",
	  bxor: "^",
	  lshift: "<<",
	  rshift: ">>",
	  rrshift: ">>>"
	}
	;(function(){
	  for(var id in assign_ops) {
	    var op = assign_ops[id]
	    exports[id] = makeOp({
	      args: ["array","array","array"],
	      body: {args:["a","b","c"],
	             body: "a=b"+op+"c"},
	      funcName: id
	    })
	    exports[id+"eq"] = makeOp({
	      args: ["array","array"],
	      body: {args:["a","b"],
	             body:"a"+op+"=b"},
	      rvalue: true,
	      funcName: id+"eq"
	    })
	    exports[id+"s"] = makeOp({
	      args: ["array", "array", "scalar"],
	      body: {args:["a","b","s"],
	             body:"a=b"+op+"s"},
	      funcName: id+"s"
	    })
	    exports[id+"seq"] = makeOp({
	      args: ["array","scalar"],
	      body: {args:["a","s"],
	             body:"a"+op+"=s"},
	      rvalue: true,
	      funcName: id+"seq"
	    })
	  }
	})();

	var unary_ops = {
	  not: "!",
	  bnot: "~",
	  neg: "-",
	  recip: "1.0/"
	}
	;(function(){
	  for(var id in unary_ops) {
	    var op = unary_ops[id]
	    exports[id] = makeOp({
	      args: ["array", "array"],
	      body: {args:["a","b"],
	             body:"a="+op+"b"},
	      funcName: id
	    })
	    exports[id+"eq"] = makeOp({
	      args: ["array"],
	      body: {args:["a"],
	             body:"a="+op+"a"},
	      rvalue: true,
	      count: 2,
	      funcName: id+"eq"
	    })
	  }
	})();

	var binary_ops = {
	  and: "&&",
	  or: "||",
	  eq: "===",
	  neq: "!==",
	  lt: "<",
	  gt: ">",
	  leq: "<=",
	  geq: ">="
	}
	;(function() {
	  for(var id in binary_ops) {
	    var op = binary_ops[id]
	    exports[id] = makeOp({
	      args: ["array","array","array"],
	      body: {args:["a", "b", "c"],
	             body:"a=b"+op+"c"},
	      funcName: id
	    })
	    exports[id+"s"] = makeOp({
	      args: ["array","array","scalar"],
	      body: {args:["a", "b", "s"],
	             body:"a=b"+op+"s"},
	      funcName: id+"s"
	    })
	    exports[id+"eq"] = makeOp({
	      args: ["array", "array"],
	      body: {args:["a", "b"],
	             body:"a=a"+op+"b"},
	      rvalue:true,
	      count:2,
	      funcName: id+"eq"
	    })
	    exports[id+"seq"] = makeOp({
	      args: ["array", "scalar"],
	      body: {args:["a","s"],
	             body:"a=a"+op+"s"},
	      rvalue:true,
	      count:2,
	      funcName: id+"seq"
	    })
	  }
	})();

	var math_unary = [
	  "abs",
	  "acos",
	  "asin",
	  "atan",
	  "ceil",
	  "cos",
	  "exp",
	  "floor",
	  "log",
	  "round",
	  "sin",
	  "sqrt",
	  "tan"
	]
	;(function() {
	  for(var i=0; i<math_unary.length; ++i) {
	    var f = math_unary[i]
	    exports[f] = makeOp({
	                    args: ["array", "array"],
	                    pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                    body: {args:["a","b"], body:"a=this_f(b)", thisVars:["this_f"]},
	                    funcName: f
	                  })
	    exports[f+"eq"] = makeOp({
	                      args: ["array"],
	                      pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                      body: {args: ["a"], body:"a=this_f(a)", thisVars:["this_f"]},
	                      rvalue: true,
	                      count: 2,
	                      funcName: f+"eq"
	                    })
	  }
	})();

	var math_comm = [
	  "max",
	  "min",
	  "atan2",
	  "pow"
	]
	;(function(){
	  for(var i=0; i<math_comm.length; ++i) {
	    var f= math_comm[i]
	    exports[f] = makeOp({
	                  args:["array", "array", "array"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b","c"], body:"a=this_f(b,c)", thisVars:["this_f"]},
	                  funcName: f
	                })
	    exports[f+"s"] = makeOp({
	                  args:["array", "array", "scalar"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b","c"], body:"a=this_f(b,c)", thisVars:["this_f"]},
	                  funcName: f+"s"
	                  })
	    exports[f+"eq"] = makeOp({ args:["array", "array"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b"], body:"a=this_f(a,b)", thisVars:["this_f"]},
	                  rvalue: true,
	                  count: 2,
	                  funcName: f+"eq"
	                  })
	    exports[f+"seq"] = makeOp({ args:["array", "scalar"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b"], body:"a=this_f(a,b)", thisVars:["this_f"]},
	                  rvalue:true,
	                  count:2,
	                  funcName: f+"seq"
	                  })
	  }
	})();

	var math_noncomm = [
	  "atan2",
	  "pow"
	]
	;(function(){
	  for(var i=0; i<math_noncomm.length; ++i) {
	    var f= math_noncomm[i]
	    exports[f+"op"] = makeOp({
	                  args:["array", "array", "array"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b","c"], body:"a=this_f(c,b)", thisVars:["this_f"]},
	                  funcName: f+"op"
	                })
	    exports[f+"ops"] = makeOp({
	                  args:["array", "array", "scalar"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b","c"], body:"a=this_f(c,b)", thisVars:["this_f"]},
	                  funcName: f+"ops"
	                  })
	    exports[f+"opeq"] = makeOp({ args:["array", "array"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b"], body:"a=this_f(b,a)", thisVars:["this_f"]},
	                  rvalue: true,
	                  count: 2,
	                  funcName: f+"opeq"
	                  })
	    exports[f+"opseq"] = makeOp({ args:["array", "scalar"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b"], body:"a=this_f(b,a)", thisVars:["this_f"]},
	                  rvalue:true,
	                  count:2,
	                  funcName: f+"opseq"
	                  })
	  }
	})();

	exports.any = compile({
	  args:["array"],
	  pre: EmptyProc,
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "if(a){return true}", localVars: [], thisVars: []},
	  post: {args:[], localVars:[], thisVars:[], body:"return false"},
	  funcName: "any"
	})

	exports.all = compile({
	  args:["array"],
	  pre: EmptyProc,
	  body: {args:[{name:"x", lvalue:false, rvalue:true, count:1}], body: "if(!x){return false}", localVars: [], thisVars: []},
	  post: {args:[], localVars:[], thisVars:[], body:"return true"},
	  funcName: "all"
	})

	exports.sum = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "this_s+=a", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
	  funcName: "sum"
	})

	exports.prod = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=1"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "this_s*=a", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
	  funcName: "prod"
	})

	exports.norm2squared = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:2}], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
	  funcName: "norm2squared"
	})
	  
	exports.norm2 = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:2}], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return Math.sqrt(this_s)"},
	  funcName: "norm2"
	})
	  

	exports.norminf = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:4}], body:"if(-a>this_s){this_s=-a}else if(a>this_s){this_s=a}", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
	  funcName: "norminf"
	})

	exports.norm1 = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:3}], body: "this_s+=a<0?-a:a", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
	  funcName: "norm1"
	})

	exports.sup = compile({
	  args: [ "array" ],
	  pre:
	   { body: "this_h=-Infinity",
	     args: [],
	     thisVars: [ "this_h" ],
	     localVars: [] },
	  body:
	   { body: "if(_inline_1_arg0_>this_h)this_h=_inline_1_arg0_",
	     args: [{"name":"_inline_1_arg0_","lvalue":false,"rvalue":true,"count":2} ],
	     thisVars: [ "this_h" ],
	     localVars: [] },
	  post:
	   { body: "return this_h",
	     args: [],
	     thisVars: [ "this_h" ],
	     localVars: [] }
	 })

	exports.inf = compile({
	  args: [ "array" ],
	  pre:
	   { body: "this_h=Infinity",
	     args: [],
	     thisVars: [ "this_h" ],
	     localVars: [] },
	  body:
	   { body: "if(_inline_1_arg0_<this_h)this_h=_inline_1_arg0_",
	     args: [{"name":"_inline_1_arg0_","lvalue":false,"rvalue":true,"count":2} ],
	     thisVars: [ "this_h" ],
	     localVars: [] },
	  post:
	   { body: "return this_h",
	     args: [],
	     thisVars: [ "this_h" ],
	     localVars: [] }
	 })

	exports.argmin = compile({
	  args:["index","array","shape"],
	  pre:{
	    body:"{this_v=Infinity;this_i=_inline_0_arg2_.slice(0)}",
	    args:[
	      {name:"_inline_0_arg0_",lvalue:false,rvalue:false,count:0},
	      {name:"_inline_0_arg1_",lvalue:false,rvalue:false,count:0},
	      {name:"_inline_0_arg2_",lvalue:false,rvalue:true,count:1}
	      ],
	    thisVars:["this_i","this_v"],
	    localVars:[]},
	  body:{
	    body:"{if(_inline_1_arg1_<this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
	    args:[
	      {name:"_inline_1_arg0_",lvalue:false,rvalue:true,count:2},
	      {name:"_inline_1_arg1_",lvalue:false,rvalue:true,count:2}],
	    thisVars:["this_i","this_v"],
	    localVars:["_inline_1_k"]},
	  post:{
	    body:"{return this_i}",
	    args:[],
	    thisVars:["this_i"],
	    localVars:[]}
	})

	exports.argmax = compile({
	  args:["index","array","shape"],
	  pre:{
	    body:"{this_v=-Infinity;this_i=_inline_0_arg2_.slice(0)}",
	    args:[
	      {name:"_inline_0_arg0_",lvalue:false,rvalue:false,count:0},
	      {name:"_inline_0_arg1_",lvalue:false,rvalue:false,count:0},
	      {name:"_inline_0_arg2_",lvalue:false,rvalue:true,count:1}
	      ],
	    thisVars:["this_i","this_v"],
	    localVars:[]},
	  body:{
	    body:"{if(_inline_1_arg1_>this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
	    args:[
	      {name:"_inline_1_arg0_",lvalue:false,rvalue:true,count:2},
	      {name:"_inline_1_arg1_",lvalue:false,rvalue:true,count:2}],
	    thisVars:["this_i","this_v"],
	    localVars:["_inline_1_k"]},
	  post:{
	    body:"{return this_i}",
	    args:[],
	    thisVars:["this_i"],
	    localVars:[]}
	})  

	exports.random = makeOp({
	  args: ["array"],
	  pre: {args:[], body:"this_f=Math.random", thisVars:["this_f"]},
	  body: {args: ["a"], body:"a=this_f()", thisVars:["this_f"]},
	  funcName: "random"
	})

	exports.assign = makeOp({
	  args:["array", "array"],
	  body: {args:["a", "b"], body:"a=b"},
	  funcName: "assign" })

	exports.assigns = makeOp({
	  args:["array", "scalar"],
	  body: {args:["a", "b"], body:"a=b"},
	  funcName: "assigns" })


	exports.equals = compile({
	  args:["array", "array"],
	  pre: EmptyProc,
	  body: {args:[{name:"x", lvalue:false, rvalue:true, count:1},
	               {name:"y", lvalue:false, rvalue:true, count:1}], 
	        body: "if(x!==y){return false}", 
	        localVars: [], 
	        thisVars: []},
	  post: {args:[], localVars:[], thisVars:[], body:"return true"},
	  funcName: "equals"
	})




/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	"use strict"

	var createThunk = __webpack_require__(19)

	function Procedure() {
	  this.argTypes = []
	  this.shimArgs = []
	  this.arrayArgs = []
	  this.arrayBlockIndices = []
	  this.scalarArgs = []
	  this.offsetArgs = []
	  this.offsetArgIndex = []
	  this.indexArgs = []
	  this.shapeArgs = []
	  this.funcName = ""
	  this.pre = null
	  this.body = null
	  this.post = null
	  this.debug = false
	}

	function compileCwise(user_args) {
	  //Create procedure
	  var proc = new Procedure()
	  
	  //Parse blocks
	  proc.pre    = user_args.pre
	  proc.body   = user_args.body
	  proc.post   = user_args.post

	  //Parse arguments
	  var proc_args = user_args.args.slice(0)
	  proc.argTypes = proc_args
	  for(var i=0; i<proc_args.length; ++i) {
	    var arg_type = proc_args[i]
	    if(arg_type === "array" || (typeof arg_type === "object" && arg_type.blockIndices)) {
	      proc.argTypes[i] = "array"
	      proc.arrayArgs.push(i)
	      proc.arrayBlockIndices.push(arg_type.blockIndices ? arg_type.blockIndices : 0)
	      proc.shimArgs.push("array" + i)
	      if(i < proc.pre.args.length && proc.pre.args[i].count>0) {
	        throw new Error("cwise: pre() block may not reference array args")
	      }
	      if(i < proc.post.args.length && proc.post.args[i].count>0) {
	        throw new Error("cwise: post() block may not reference array args")
	      }
	    } else if(arg_type === "scalar") {
	      proc.scalarArgs.push(i)
	      proc.shimArgs.push("scalar" + i)
	    } else if(arg_type === "index") {
	      proc.indexArgs.push(i)
	      if(i < proc.pre.args.length && proc.pre.args[i].count > 0) {
	        throw new Error("cwise: pre() block may not reference array index")
	      }
	      if(i < proc.body.args.length && proc.body.args[i].lvalue) {
	        throw new Error("cwise: body() block may not write to array index")
	      }
	      if(i < proc.post.args.length && proc.post.args[i].count > 0) {
	        throw new Error("cwise: post() block may not reference array index")
	      }
	    } else if(arg_type === "shape") {
	      proc.shapeArgs.push(i)
	      if(i < proc.pre.args.length && proc.pre.args[i].lvalue) {
	        throw new Error("cwise: pre() block may not write to array shape")
	      }
	      if(i < proc.body.args.length && proc.body.args[i].lvalue) {
	        throw new Error("cwise: body() block may not write to array shape")
	      }
	      if(i < proc.post.args.length && proc.post.args[i].lvalue) {
	        throw new Error("cwise: post() block may not write to array shape")
	      }
	    } else if(typeof arg_type === "object" && arg_type.offset) {
	      proc.argTypes[i] = "offset"
	      proc.offsetArgs.push({ array: arg_type.array, offset:arg_type.offset })
	      proc.offsetArgIndex.push(i)
	    } else {
	      throw new Error("cwise: Unknown argument type " + proc_args[i])
	    }
	  }
	  
	  //Make sure at least one array argument was specified
	  if(proc.arrayArgs.length <= 0) {
	    throw new Error("cwise: No array arguments specified")
	  }
	  
	  //Make sure arguments are correct
	  if(proc.pre.args.length > proc_args.length) {
	    throw new Error("cwise: Too many arguments in pre() block")
	  }
	  if(proc.body.args.length > proc_args.length) {
	    throw new Error("cwise: Too many arguments in body() block")
	  }
	  if(proc.post.args.length > proc_args.length) {
	    throw new Error("cwise: Too many arguments in post() block")
	  }

	  //Check debug flag
	  proc.debug = !!user_args.printCode || !!user_args.debug
	  
	  //Retrieve name
	  proc.funcName = user_args.funcName || "cwise"
	  
	  //Read in block size
	  proc.blockSize = user_args.blockSize || 64

	  return createThunk(proc)
	}

	module.exports = compileCwise


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	"use strict"

	// The function below is called when constructing a cwise function object, and does the following:
	// A function object is constructed which accepts as argument a compilation function and returns another function.
	// It is this other function that is eventually returned by createThunk, and this function is the one that actually
	// checks whether a certain pattern of arguments has already been used before and compiles new loops as needed.
	// The compilation passed to the first function object is used for compiling new functions.
	// Once this function object is created, it is called with compile as argument, where the first argument of compile
	// is bound to "proc" (essentially containing a preprocessed version of the user arguments to cwise).
	// So createThunk roughly works like this:
	// function createThunk(proc) {
	//   var thunk = function(compileBound) {
	//     var CACHED = {}
	//     return function(arrays and scalars) {
	//       if (dtype and order of arrays in CACHED) {
	//         var func = CACHED[dtype and order of arrays]
	//       } else {
	//         var func = CACHED[dtype and order of arrays] = compileBound(dtype and order of arrays)
	//       }
	//       return func(arrays and scalars)
	//     }
	//   }
	//   return thunk(compile.bind1(proc))
	// }

	var compile = __webpack_require__(20)

	function createThunk(proc) {
	  var code = ["'use strict'", "var CACHED={}"]
	  var vars = []
	  var thunkName = proc.funcName + "_cwise_thunk"
	  
	  //Build thunk
	  code.push(["return function ", thunkName, "(", proc.shimArgs.join(","), "){"].join(""))
	  var typesig = []
	  var string_typesig = []
	  var proc_args = [["array",proc.arrayArgs[0],".shape.slice(", // Slice shape so that we only retain the shape over which we iterate (which gets passed to the cwise operator as SS).
	                    Math.max(0,proc.arrayBlockIndices[0]),proc.arrayBlockIndices[0]<0?(","+proc.arrayBlockIndices[0]+")"):")"].join("")]
	  var shapeLengthConditions = [], shapeConditions = []
	  // Process array arguments
	  for(var i=0; i<proc.arrayArgs.length; ++i) {
	    var j = proc.arrayArgs[i]
	    vars.push(["t", j, "=array", j, ".dtype,",
	               "r", j, "=array", j, ".order"].join(""))
	    typesig.push("t" + j)
	    typesig.push("r" + j)
	    string_typesig.push("t"+j)
	    string_typesig.push("r"+j+".join()")
	    proc_args.push("array" + j + ".data")
	    proc_args.push("array" + j + ".stride")
	    proc_args.push("array" + j + ".offset|0")
	    if (i>0) { // Gather conditions to check for shape equality (ignoring block indices)
	      shapeLengthConditions.push("array" + proc.arrayArgs[0] + ".shape.length===array" + j + ".shape.length+" + (Math.abs(proc.arrayBlockIndices[0])-Math.abs(proc.arrayBlockIndices[i])))
	      shapeConditions.push("array" + proc.arrayArgs[0] + ".shape[shapeIndex+" + Math.max(0,proc.arrayBlockIndices[0]) + "]===array" + j + ".shape[shapeIndex+" + Math.max(0,proc.arrayBlockIndices[i]) + "]")
	    }
	  }
	  // Check for shape equality
	  if (proc.arrayArgs.length > 1) {
	    code.push("if (!(" + shapeLengthConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same dimensionality!')")
	    code.push("for(var shapeIndex=array" + proc.arrayArgs[0] + ".shape.length-" + Math.abs(proc.arrayBlockIndices[0]) + "; shapeIndex-->0;) {")
	    code.push("if (!(" + shapeConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same shape!')")
	    code.push("}")
	  }
	  // Process scalar arguments
	  for(var i=0; i<proc.scalarArgs.length; ++i) {
	    proc_args.push("scalar" + proc.scalarArgs[i])
	  }
	  // Check for cached function (and if not present, generate it)
	  vars.push(["type=[", string_typesig.join(","), "].join()"].join(""))
	  vars.push("proc=CACHED[type]")
	  code.push("var " + vars.join(","))
	  
	  code.push(["if(!proc){",
	             "CACHED[type]=proc=compile([", typesig.join(","), "])}",
	             "return proc(", proc_args.join(","), ")}"].join(""))

	  if(proc.debug) {
	    console.log("-----Generated thunk:\n" + code.join("\n") + "\n----------")
	  }
	  
	  //Compile thunk
	  var thunk = new Function("compile", code.join("\n"))
	  return thunk(compile.bind(undefined, proc))
	}

	module.exports = createThunk


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	"use strict"

	var uniq = __webpack_require__(21)

	// This function generates very simple loops analogous to how you typically traverse arrays (the outermost loop corresponds to the slowest changing index, the innermost loop to the fastest changing index)
	// TODO: If two arrays have the same strides (and offsets) there is potential for decreasing the number of "pointers" and related variables. The drawback is that the type signature would become more specific and that there would thus be less potential for caching, but it might still be worth it, especially when dealing with large numbers of arguments.
	function innerFill(order, proc, body) {
	  var dimension = order.length
	    , nargs = proc.arrayArgs.length
	    , has_index = proc.indexArgs.length>0
	    , code = []
	    , vars = []
	    , idx=0, pidx=0, i, j
	  for(i=0; i<dimension; ++i) { // Iteration variables
	    vars.push(["i",i,"=0"].join(""))
	  }
	  //Compute scan deltas
	  for(j=0; j<nargs; ++j) {
	    for(i=0; i<dimension; ++i) {
	      pidx = idx
	      idx = order[i]
	      if(i === 0) { // The innermost/fastest dimension's delta is simply its stride
	        vars.push(["d",j,"s",i,"=t",j,"p",idx].join(""))
	      } else { // For other dimensions the delta is basically the stride minus something which essentially "rewinds" the previous (more inner) dimension
	        vars.push(["d",j,"s",i,"=(t",j,"p",idx,"-s",pidx,"*t",j,"p",pidx,")"].join(""))
	      }
	    }
	  }
	  code.push("var " + vars.join(","))
	  //Scan loop
	  for(i=dimension-1; i>=0; --i) { // Start at largest stride and work your way inwards
	    idx = order[i]
	    code.push(["for(i",i,"=0;i",i,"<s",idx,";++i",i,"){"].join(""))
	  }
	  //Push body of inner loop
	  code.push(body)
	  //Advance scan pointers
	  for(i=0; i<dimension; ++i) {
	    pidx = idx
	    idx = order[i]
	    for(j=0; j<nargs; ++j) {
	      code.push(["p",j,"+=d",j,"s",i].join(""))
	    }
	    if(has_index) {
	      if(i > 0) {
	        code.push(["index[",pidx,"]-=s",pidx].join(""))
	      }
	      code.push(["++index[",idx,"]"].join(""))
	    }
	    code.push("}")
	  }
	  return code.join("\n")
	}

	// Generate "outer" loops that loop over blocks of data, applying "inner" loops to the blocks by manipulating the local variables in such a way that the inner loop only "sees" the current block.
	// TODO: If this is used, then the previous declaration (done by generateCwiseOp) of s* is essentially unnecessary.
	//       I believe the s* are not used elsewhere (in particular, I don't think they're used in the pre/post parts and "shape" is defined independently), so it would be possible to make defining the s* dependent on what loop method is being used.
	function outerFill(matched, order, proc, body) {
	  var dimension = order.length
	    , nargs = proc.arrayArgs.length
	    , blockSize = proc.blockSize
	    , has_index = proc.indexArgs.length > 0
	    , code = []
	  for(var i=0; i<nargs; ++i) {
	    code.push(["var offset",i,"=p",i].join(""))
	  }
	  //Generate loops for unmatched dimensions
	  // The order in which these dimensions are traversed is fairly arbitrary (from small stride to large stride, for the first argument)
	  // TODO: It would be nice if the order in which these loops are placed would also be somehow "optimal" (at the very least we should check that it really doesn't hurt us if they're not).
	  for(var i=matched; i<dimension; ++i) {
	    code.push(["for(var j"+i+"=SS[", order[i], "]|0;j", i, ">0;){"].join("")) // Iterate back to front
	    code.push(["if(j",i,"<",blockSize,"){"].join("")) // Either decrease j by blockSize (s = blockSize), or set it to zero (after setting s = j).
	    code.push(["s",order[i],"=j",i].join(""))
	    code.push(["j",i,"=0"].join(""))
	    code.push(["}else{s",order[i],"=",blockSize].join(""))
	    code.push(["j",i,"-=",blockSize,"}"].join(""))
	    if(has_index) {
	      code.push(["index[",order[i],"]=j",i].join(""))
	    }
	  }
	  for(var i=0; i<nargs; ++i) {
	    var indexStr = ["offset"+i]
	    for(var j=matched; j<dimension; ++j) {
	      indexStr.push(["j",j,"*t",i,"p",order[j]].join(""))
	    }
	    code.push(["p",i,"=(",indexStr.join("+"),")"].join(""))
	  }
	  code.push(innerFill(order, proc, body))
	  for(var i=matched; i<dimension; ++i) {
	    code.push("}")
	  }
	  return code.join("\n")
	}

	//Count the number of compatible inner orders
	// This is the length of the longest common prefix of the arrays in orders.
	// Each array in orders lists the dimensions of the correspond ndarray in order of increasing stride.
	// This is thus the maximum number of dimensions that can be efficiently traversed by simple nested loops for all arrays.
	function countMatches(orders) {
	  var matched = 0, dimension = orders[0].length
	  while(matched < dimension) {
	    for(var j=1; j<orders.length; ++j) {
	      if(orders[j][matched] !== orders[0][matched]) {
	        return matched
	      }
	    }
	    ++matched
	  }
	  return matched
	}

	//Processes a block according to the given data types
	// Replaces variable names by different ones, either "local" ones (that are then ferried in and out of the given array) or ones matching the arguments that the function performing the ultimate loop will accept.
	function processBlock(block, proc, dtypes) {
	  var code = block.body
	  var pre = []
	  var post = []
	  for(var i=0; i<block.args.length; ++i) {
	    var carg = block.args[i]
	    if(carg.count <= 0) {
	      continue
	    }
	    var re = new RegExp(carg.name, "g")
	    var ptrStr = ""
	    var arrNum = proc.arrayArgs.indexOf(i)
	    switch(proc.argTypes[i]) {
	      case "offset":
	        var offArgIndex = proc.offsetArgIndex.indexOf(i)
	        var offArg = proc.offsetArgs[offArgIndex]
	        arrNum = offArg.array
	        ptrStr = "+q" + offArgIndex // Adds offset to the "pointer" in the array
	      case "array":
	        ptrStr = "p" + arrNum + ptrStr
	        var localStr = "l" + i
	        var arrStr = "a" + arrNum
	        if (proc.arrayBlockIndices[arrNum] === 0) { // Argument to body is just a single value from this array
	          if(carg.count === 1) { // Argument/array used only once(?)
	            if(dtypes[arrNum] === "generic") {
	              if(carg.lvalue) {
	                pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
	                code = code.replace(re, localStr)
	                post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
	              } else {
	                code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""))
	              }
	            } else {
	              code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""))
	            }
	          } else if(dtypes[arrNum] === "generic") {
	            pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // TODO: Could we optimize by checking for carg.rvalue?
	            code = code.replace(re, localStr)
	            if(carg.lvalue) {
	              post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
	            }
	          } else {
	            pre.push(["var ", localStr, "=", arrStr, "[", ptrStr, "]"].join("")) // TODO: Could we optimize by checking for carg.rvalue?
	            code = code.replace(re, localStr)
	            if(carg.lvalue) {
	              post.push([arrStr, "[", ptrStr, "]=", localStr].join(""))
	            }
	          }
	        } else { // Argument to body is a "block"
	          var reStrArr = [carg.name], ptrStrArr = [ptrStr]
	          for(var j=0; j<Math.abs(proc.arrayBlockIndices[arrNum]); j++) {
	            reStrArr.push("\\s*\\[([^\\]]+)\\]")
	            ptrStrArr.push("$" + (j+1) + "*t" + arrNum + "b" + j) // Matched index times stride
	          }
	          re = new RegExp(reStrArr.join(""), "g")
	          ptrStr = ptrStrArr.join("+")
	          if(dtypes[arrNum] === "generic") {
	            /*if(carg.lvalue) {
	              pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
	              code = code.replace(re, localStr)
	              post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
	            } else {
	              code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""))
	            }*/
	            throw new Error("cwise: Generic arrays not supported in combination with blocks!")
	          } else {
	            // This does not produce any local variables, even if variables are used multiple times. It would be possible to do so, but it would complicate things quite a bit.
	            code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""))
	          }
	        }
	      break
	      case "scalar":
	        code = code.replace(re, "Y" + proc.scalarArgs.indexOf(i))
	      break
	      case "index":
	        code = code.replace(re, "index")
	      break
	      case "shape":
	        code = code.replace(re, "shape")
	      break
	    }
	  }
	  return [pre.join("\n"), code, post.join("\n")].join("\n").trim()
	}

	function typeSummary(dtypes) {
	  var summary = new Array(dtypes.length)
	  var allEqual = true
	  for(var i=0; i<dtypes.length; ++i) {
	    var t = dtypes[i]
	    var digits = t.match(/\d+/)
	    if(!digits) {
	      digits = ""
	    } else {
	      digits = digits[0]
	    }
	    if(t.charAt(0) === 0) {
	      summary[i] = "u" + t.charAt(1) + digits
	    } else {
	      summary[i] = t.charAt(0) + digits
	    }
	    if(i > 0) {
	      allEqual = allEqual && summary[i] === summary[i-1]
	    }
	  }
	  if(allEqual) {
	    return summary[0]
	  }
	  return summary.join("")
	}

	//Generates a cwise operator
	function generateCWiseOp(proc, typesig) {

	  //Compute dimension
	  // Arrays get put first in typesig, and there are two entries per array (dtype and order), so this gets the number of dimensions in the first array arg.
	  var dimension = (typesig[1].length - Math.abs(proc.arrayBlockIndices[0]))|0
	  var orders = new Array(proc.arrayArgs.length)
	  var dtypes = new Array(proc.arrayArgs.length)
	  for(var i=0; i<proc.arrayArgs.length; ++i) {
	    dtypes[i] = typesig[2*i]
	    orders[i] = typesig[2*i+1]
	  }
	  
	  //Determine where block and loop indices start and end
	  var blockBegin = [], blockEnd = [] // These indices are exposed as blocks
	  var loopBegin = [], loopEnd = [] // These indices are iterated over
	  var loopOrders = [] // orders restricted to the loop indices
	  for(var i=0; i<proc.arrayArgs.length; ++i) {
	    if (proc.arrayBlockIndices[i]<0) {
	      loopBegin.push(0)
	      loopEnd.push(dimension)
	      blockBegin.push(dimension)
	      blockEnd.push(dimension+proc.arrayBlockIndices[i])
	    } else {
	      loopBegin.push(proc.arrayBlockIndices[i]) // Non-negative
	      loopEnd.push(proc.arrayBlockIndices[i]+dimension)
	      blockBegin.push(0)
	      blockEnd.push(proc.arrayBlockIndices[i])
	    }
	    var newOrder = []
	    for(var j=0; j<orders[i].length; j++) {
	      if (loopBegin[i]<=orders[i][j] && orders[i][j]<loopEnd[i]) {
	        newOrder.push(orders[i][j]-loopBegin[i]) // If this is a loop index, put it in newOrder, subtracting loopBegin, to make sure that all loopOrders are using a common set of indices.
	      }
	    }
	    loopOrders.push(newOrder)
	  }

	  //First create arguments for procedure
	  var arglist = ["SS"] // SS is the overall shape over which we iterate
	  var code = ["'use strict'"]
	  var vars = []
	  
	  for(var j=0; j<dimension; ++j) {
	    vars.push(["s", j, "=SS[", j, "]"].join("")) // The limits for each dimension.
	  }
	  for(var i=0; i<proc.arrayArgs.length; ++i) {
	    arglist.push("a"+i) // Actual data array
	    arglist.push("t"+i) // Strides
	    arglist.push("p"+i) // Offset in the array at which the data starts (also used for iterating over the data)
	    
	    for(var j=0; j<dimension; ++j) { // Unpack the strides into vars for looping
	      vars.push(["t",i,"p",j,"=t",i,"[",loopBegin[i]+j,"]"].join(""))
	    }
	    
	    for(var j=0; j<Math.abs(proc.arrayBlockIndices[i]); ++j) { // Unpack the strides into vars for block iteration
	      vars.push(["t",i,"b",j,"=t",i,"[",blockBegin[i]+j,"]"].join(""))
	    }
	  }
	  for(var i=0; i<proc.scalarArgs.length; ++i) {
	    arglist.push("Y" + i)
	  }
	  if(proc.shapeArgs.length > 0) {
	    vars.push("shape=SS.slice(0)") // Makes the shape over which we iterate available to the user defined functions (so you can use width/height for example)
	  }
	  if(proc.indexArgs.length > 0) {
	    // Prepare an array to keep track of the (logical) indices, initialized to dimension zeroes.
	    var zeros = new Array(dimension)
	    for(var i=0; i<dimension; ++i) {
	      zeros[i] = "0"
	    }
	    vars.push(["index=[", zeros.join(","), "]"].join(""))
	  }
	  for(var i=0; i<proc.offsetArgs.length; ++i) { // Offset arguments used for stencil operations
	    var off_arg = proc.offsetArgs[i]
	    var init_string = []
	    for(var j=0; j<off_arg.offset.length; ++j) {
	      if(off_arg.offset[j] === 0) {
	        continue
	      } else if(off_arg.offset[j] === 1) {
	        init_string.push(["t", off_arg.array, "p", j].join(""))      
	      } else {
	        init_string.push([off_arg.offset[j], "*t", off_arg.array, "p", j].join(""))
	      }
	    }
	    if(init_string.length === 0) {
	      vars.push("q" + i + "=0")
	    } else {
	      vars.push(["q", i, "=", init_string.join("+")].join(""))
	    }
	  }

	  //Prepare this variables
	  var thisVars = uniq([].concat(proc.pre.thisVars)
	                      .concat(proc.body.thisVars)
	                      .concat(proc.post.thisVars))
	  vars = vars.concat(thisVars)
	  code.push("var " + vars.join(","))
	  for(var i=0; i<proc.arrayArgs.length; ++i) {
	    code.push("p"+i+"|=0")
	  }
	  
	  //Inline prelude
	  if(proc.pre.body.length > 3) {
	    code.push(processBlock(proc.pre, proc, dtypes))
	  }

	  //Process body
	  var body = processBlock(proc.body, proc, dtypes)
	  var matched = countMatches(loopOrders)
	  if(matched < dimension) {
	    code.push(outerFill(matched, loopOrders[0], proc, body)) // TODO: Rather than passing loopOrders[0], it might be interesting to look at passing an order that represents the majority of the arguments for example.
	  } else {
	    code.push(innerFill(loopOrders[0], proc, body))
	  }

	  //Inline epilog
	  if(proc.post.body.length > 3) {
	    code.push(processBlock(proc.post, proc, dtypes))
	  }
	  
	  if(proc.debug) {
	    console.log("-----Generated cwise routine for ", typesig, ":\n" + code.join("\n") + "\n----------")
	  }
	  
	  var loopName = [(proc.funcName||"unnamed"), "_cwise_loop_", orders[0].join("s"),"m",matched,typeSummary(dtypes)].join("")
	  var f = new Function(["function ",loopName,"(", arglist.join(","),"){", code.join("\n"),"} return ", loopName].join(""))
	  return f()
	}
	module.exports = generateCWiseOp


/***/ },
/* 21 */
/***/ function(module, exports) {

	"use strict"

	function unique_pred(list, compare) {
	  var ptr = 1
	    , len = list.length
	    , a=list[0], b=list[0]
	  for(var i=1; i<len; ++i) {
	    b = a
	    a = list[i]
	    if(compare(a, b)) {
	      if(i === ptr) {
	        ptr++
	        continue
	      }
	      list[ptr++] = a
	    }
	  }
	  list.length = ptr
	  return list
	}

	function unique_eq(list) {
	  var ptr = 1
	    , len = list.length
	    , a=list[0], b = list[0]
	  for(var i=1; i<len; ++i, b=a) {
	    b = a
	    a = list[i]
	    if(a !== b) {
	      if(i === ptr) {
	        ptr++
	        continue
	      }
	      list[ptr++] = a
	    }
	  }
	  list.length = ptr
	  return list
	}

	function unique(list, compare, sorted) {
	  if(list.length === 0) {
	    return list
	  }
	  if(compare) {
	    if(!sorted) {
	      list.sort(compare)
	    }
	    return unique_pred(list, compare)
	  }
	  if(!sorted) {
	    list.sort()
	  }
	  return unique_eq(list)
	}

	module.exports = unique


/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, Buffer) {'use strict'

	var bits = __webpack_require__(27)
	var dup = __webpack_require__(28)

	//Legacy pool support
	if(!global.__TYPEDARRAY_POOL) {
	  global.__TYPEDARRAY_POOL = {
	      UINT8   : dup([32, 0])
	    , UINT16  : dup([32, 0])
	    , UINT32  : dup([32, 0])
	    , INT8    : dup([32, 0])
	    , INT16   : dup([32, 0])
	    , INT32   : dup([32, 0])
	    , FLOAT   : dup([32, 0])
	    , DOUBLE  : dup([32, 0])
	    , DATA    : dup([32, 0])
	    , UINT8C  : dup([32, 0])
	    , BUFFER  : dup([32, 0])
	  }
	}

	var hasUint8C = (typeof Uint8ClampedArray) !== 'undefined'
	var POOL = global.__TYPEDARRAY_POOL

	//Upgrade pool
	if(!POOL.UINT8C) {
	  POOL.UINT8C = dup([32, 0])
	}
	if(!POOL.BUFFER) {
	  POOL.BUFFER = dup([32, 0])
	}

	//New technique: Only allocate from ArrayBufferView and Buffer
	var DATA    = POOL.DATA
	  , BUFFER  = POOL.BUFFER

	exports.free = function free(array) {
	  if(Buffer.isBuffer(array)) {
	    BUFFER[bits.log2(array.length)].push(array)
	  } else {
	    if(Object.prototype.toString.call(array) !== '[object ArrayBuffer]') {
	      array = array.buffer
	    }
	    if(!array) {
	      return
	    }
	    var n = array.length || array.byteLength
	    var log_n = bits.log2(n)|0
	    DATA[log_n].push(array)
	  }
	}

	function freeArrayBuffer(buffer) {
	  if(!buffer) {
	    return
	  }
	  var n = buffer.length || buffer.byteLength
	  var log_n = bits.log2(n)
	  DATA[log_n].push(buffer)
	}

	function freeTypedArray(array) {
	  freeArrayBuffer(array.buffer)
	}

	exports.freeUint8 =
	exports.freeUint16 =
	exports.freeUint32 =
	exports.freeInt8 =
	exports.freeInt16 =
	exports.freeInt32 =
	exports.freeFloat32 = 
	exports.freeFloat =
	exports.freeFloat64 = 
	exports.freeDouble = 
	exports.freeUint8Clamped = 
	exports.freeDataView = freeTypedArray

	exports.freeArrayBuffer = freeArrayBuffer

	exports.freeBuffer = function freeBuffer(array) {
	  BUFFER[bits.log2(array.length)].push(array)
	}

	exports.malloc = function malloc(n, dtype) {
	  if(dtype === undefined || dtype === 'arraybuffer') {
	    return mallocArrayBuffer(n)
	  } else {
	    switch(dtype) {
	      case 'uint8':
	        return mallocUint8(n)
	      case 'uint16':
	        return mallocUint16(n)
	      case 'uint32':
	        return mallocUint32(n)
	      case 'int8':
	        return mallocInt8(n)
	      case 'int16':
	        return mallocInt16(n)
	      case 'int32':
	        return mallocInt32(n)
	      case 'float':
	      case 'float32':
	        return mallocFloat(n)
	      case 'double':
	      case 'float64':
	        return mallocDouble(n)
	      case 'uint8_clamped':
	        return mallocUint8Clamped(n)
	      case 'buffer':
	        return mallocBuffer(n)
	      case 'data':
	      case 'dataview':
	        return mallocDataView(n)

	      default:
	        return null
	    }
	  }
	  return null
	}

	function mallocArrayBuffer(n) {
	  var n = bits.nextPow2(n)
	  var log_n = bits.log2(n)
	  var d = DATA[log_n]
	  if(d.length > 0) {
	    return d.pop()
	  }
	  return new ArrayBuffer(n)
	}
	exports.mallocArrayBuffer = mallocArrayBuffer

	function mallocUint8(n) {
	  return new Uint8Array(mallocArrayBuffer(n), 0, n)
	}
	exports.mallocUint8 = mallocUint8

	function mallocUint16(n) {
	  return new Uint16Array(mallocArrayBuffer(2*n), 0, n)
	}
	exports.mallocUint16 = mallocUint16

	function mallocUint32(n) {
	  return new Uint32Array(mallocArrayBuffer(4*n), 0, n)
	}
	exports.mallocUint32 = mallocUint32

	function mallocInt8(n) {
	  return new Int8Array(mallocArrayBuffer(n), 0, n)
	}
	exports.mallocInt8 = mallocInt8

	function mallocInt16(n) {
	  return new Int16Array(mallocArrayBuffer(2*n), 0, n)
	}
	exports.mallocInt16 = mallocInt16

	function mallocInt32(n) {
	  return new Int32Array(mallocArrayBuffer(4*n), 0, n)
	}
	exports.mallocInt32 = mallocInt32

	function mallocFloat(n) {
	  return new Float32Array(mallocArrayBuffer(4*n), 0, n)
	}
	exports.mallocFloat32 = exports.mallocFloat = mallocFloat

	function mallocDouble(n) {
	  return new Float64Array(mallocArrayBuffer(8*n), 0, n)
	}
	exports.mallocFloat64 = exports.mallocDouble = mallocDouble

	function mallocUint8Clamped(n) {
	  if(hasUint8C) {
	    return new Uint8ClampedArray(mallocArrayBuffer(n), 0, n)
	  } else {
	    return mallocUint8(n)
	  }
	}
	exports.mallocUint8Clamped = mallocUint8Clamped

	function mallocDataView(n) {
	  return new DataView(mallocArrayBuffer(n), 0, n)
	}
	exports.mallocDataView = mallocDataView

	function mallocBuffer(n) {
	  n = bits.nextPow2(n)
	  var log_n = bits.log2(n)
	  var cache = BUFFER[log_n]
	  if(cache.length > 0) {
	    return cache.pop()
	  }
	  return new Buffer(n)
	}
	exports.mallocBuffer = mallocBuffer

	exports.clearCache = function clearCache() {
	  for(var i=0; i<32; ++i) {
	    POOL.UINT8[i].length = 0
	    POOL.UINT16[i].length = 0
	    POOL.UINT32[i].length = 0
	    POOL.INT8[i].length = 0
	    POOL.INT16[i].length = 0
	    POOL.INT32[i].length = 0
	    POOL.FLOAT[i].length = 0
	    POOL.DOUBLE[i].length = 0
	    POOL.UINT8C[i].length = 0
	    DATA[i].length = 0
	    BUFFER[i].length = 0
	  }
	}
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(23).Buffer))

/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */

	var base64 = __webpack_require__(24)
	var ieee754 = __webpack_require__(25)
	var isArray = __webpack_require__(26)

	exports.Buffer = Buffer
	exports.SlowBuffer = SlowBuffer
	exports.INSPECT_MAX_BYTES = 50
	Buffer.poolSize = 8192 // not used by this implementation

	var rootParent = {}

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Use Object implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * Note:
	 *
	 * - Implementation must support adding new properties to `Uint8Array` instances.
	 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
	 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
	 *
	 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
	 *
	 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
	 *    incorrect length in some situations.
	 *
	 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
	 * get the Object implementation, which is slower but will work correctly.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = (function () {
	  function Foo () {}
	  try {
	    var buf = new ArrayBuffer(0)
	    var arr = new Uint8Array(buf)
	    arr.foo = function () { return 42 }
	    arr.constructor = Foo
	    return arr.foo() === 42 && // typed array instances can be augmented
	        arr.constructor === Foo && // constructor can be set
	        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
	        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
	  } catch (e) {
	    return false
	  }
	})()

	function kMaxLength () {
	  return Buffer.TYPED_ARRAY_SUPPORT
	    ? 0x7fffffff
	    : 0x3fffffff
	}

	/**
	 * Class: Buffer
	 * =============
	 *
	 * The Buffer constructor returns instances of `Uint8Array` that are augmented
	 * with function properties for all the node `Buffer` API functions. We use
	 * `Uint8Array` so that square bracket notation works as expected -- it returns
	 * a single octet.
	 *
	 * By augmenting the instances, we can avoid modifying the `Uint8Array`
	 * prototype.
	 */
	function Buffer (arg) {
	  if (!(this instanceof Buffer)) {
	    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
	    if (arguments.length > 1) return new Buffer(arg, arguments[1])
	    return new Buffer(arg)
	  }

	  this.length = 0
	  this.parent = undefined

	  // Common case.
	  if (typeof arg === 'number') {
	    return fromNumber(this, arg)
	  }

	  // Slightly less common case.
	  if (typeof arg === 'string') {
	    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
	  }

	  // Unusual.
	  return fromObject(this, arg)
	}

	function fromNumber (that, length) {
	  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) {
	    for (var i = 0; i < length; i++) {
	      that[i] = 0
	    }
	  }
	  return that
	}

	function fromString (that, string, encoding) {
	  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

	  // Assumption: byteLength() return value is always < kMaxLength.
	  var length = byteLength(string, encoding) | 0
	  that = allocate(that, length)

	  that.write(string, encoding)
	  return that
	}

	function fromObject (that, object) {
	  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

	  if (isArray(object)) return fromArray(that, object)

	  if (object == null) {
	    throw new TypeError('must start with number, buffer, array or string')
	  }

	  if (typeof ArrayBuffer !== 'undefined' && object.buffer instanceof ArrayBuffer) {
	    return fromTypedArray(that, object)
	  }

	  if (object.length) return fromArrayLike(that, object)

	  return fromJsonObject(that, object)
	}

	function fromBuffer (that, buffer) {
	  var length = checked(buffer.length) | 0
	  that = allocate(that, length)
	  buffer.copy(that, 0, 0, length)
	  return that
	}

	function fromArray (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	// Duplicate of fromArray() to keep fromArray() monomorphic.
	function fromTypedArray (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  // Truncating the elements is probably not what people expect from typed
	  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
	  // of the old Buffer constructor.
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	function fromArrayLike (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
	// Returns a zero-length buffer for inputs that don't conform to the spec.
	function fromJsonObject (that, object) {
	  var array
	  var length = 0

	  if (object.type === 'Buffer' && isArray(object.data)) {
	    array = object.data
	    length = checked(array.length) | 0
	  }
	  that = allocate(that, length)

	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	function allocate (that, length) {
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = Buffer._augment(new Uint8Array(length))
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that.length = length
	    that._isBuffer = true
	  }

	  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
	  if (fromPool) that.parent = rootParent

	  return that
	}

	function checked (length) {
	  // Note: cannot use `length < kMaxLength` here because that fails when
	  // length is NaN (which is otherwise coerced to zero.)
	  if (length >= kMaxLength()) {
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
	  }
	  return length | 0
	}

	function SlowBuffer (subject, encoding) {
	  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

	  var buf = new Buffer(subject, encoding)
	  delete buf.parent
	  return buf
	}

	Buffer.isBuffer = function isBuffer (b) {
	  return !!(b != null && b._isBuffer)
	}

	Buffer.compare = function compare (a, b) {
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
	    throw new TypeError('Arguments must be Buffers')
	  }

	  if (a === b) return 0

	  var x = a.length
	  var y = b.length

	  var i = 0
	  var len = Math.min(x, y)
	  while (i < len) {
	    if (a[i] !== b[i]) break

	    ++i
	  }

	  if (i !== len) {
	    x = a[i]
	    y = b[i]
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	Buffer.isEncoding = function isEncoding (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'binary':
	    case 'base64':
	    case 'raw':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	}

	Buffer.concat = function concat (list, length) {
	  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

	  if (list.length === 0) {
	    return new Buffer(0)
	  } else if (list.length === 1) {
	    return list[0]
	  }

	  var i
	  if (length === undefined) {
	    length = 0
	    for (i = 0; i < list.length; i++) {
	      length += list[i].length
	    }
	  }

	  var buf = new Buffer(length)
	  var pos = 0
	  for (i = 0; i < list.length; i++) {
	    var item = list[i]
	    item.copy(buf, pos)
	    pos += item.length
	  }
	  return buf
	}

	function byteLength (string, encoding) {
	  if (typeof string !== 'string') string = '' + string

	  var len = string.length
	  if (len === 0) return 0

	  // Use a for loop to avoid recursion
	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'ascii':
	      case 'binary':
	      // Deprecated
	      case 'raw':
	      case 'raws':
	        return len
	      case 'utf8':
	      case 'utf-8':
	        return utf8ToBytes(string).length
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return len * 2
	      case 'hex':
	        return len >>> 1
	      case 'base64':
	        return base64ToBytes(string).length
	      default:
	        if (loweredCase) return utf8ToBytes(string).length // assume utf8
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}
	Buffer.byteLength = byteLength

	// pre-set for values that may exist in the future
	Buffer.prototype.length = undefined
	Buffer.prototype.parent = undefined

	function slowToString (encoding, start, end) {
	  var loweredCase = false

	  start = start | 0
	  end = end === undefined || end === Infinity ? this.length : end | 0

	  if (!encoding) encoding = 'utf8'
	  if (start < 0) start = 0
	  if (end > this.length) end = this.length
	  if (end <= start) return ''

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'binary':
	        return binarySlice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toString = function toString () {
	  var length = this.length | 0
	  if (length === 0) return ''
	  if (arguments.length === 0) return utf8Slice(this, 0, length)
	  return slowToString.apply(this, arguments)
	}

	Buffer.prototype.equals = function equals (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return true
	  return Buffer.compare(this, b) === 0
	}

	Buffer.prototype.inspect = function inspect () {
	  var str = ''
	  var max = exports.INSPECT_MAX_BYTES
	  if (this.length > 0) {
	    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
	    if (this.length > max) str += ' ... '
	  }
	  return '<Buffer ' + str + '>'
	}

	Buffer.prototype.compare = function compare (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return 0
	  return Buffer.compare(this, b)
	}

	Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
	  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
	  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
	  byteOffset >>= 0

	  if (this.length === 0) return -1
	  if (byteOffset >= this.length) return -1

	  // Negative offsets start from the end of the buffer
	  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

	  if (typeof val === 'string') {
	    if (val.length === 0) return -1 // special case: looking for empty string always fails
	    return String.prototype.indexOf.call(this, val, byteOffset)
	  }
	  if (Buffer.isBuffer(val)) {
	    return arrayIndexOf(this, val, byteOffset)
	  }
	  if (typeof val === 'number') {
	    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
	      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
	    }
	    return arrayIndexOf(this, [ val ], byteOffset)
	  }

	  function arrayIndexOf (arr, val, byteOffset) {
	    var foundIndex = -1
	    for (var i = 0; byteOffset + i < arr.length; i++) {
	      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
	        if (foundIndex === -1) foundIndex = i
	        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
	      } else {
	        foundIndex = -1
	      }
	    }
	    return -1
	  }

	  throw new TypeError('val must be string, number or Buffer')
	}

	// `get` will be removed in Node 0.13+
	Buffer.prototype.get = function get (offset) {
	  console.log('.get() is deprecated. Access using array indexes instead.')
	  return this.readUInt8(offset)
	}

	// `set` will be removed in Node 0.13+
	Buffer.prototype.set = function set (v, offset) {
	  console.log('.set() is deprecated. Access using array indexes instead.')
	  return this.writeUInt8(v, offset)
	}

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0
	  var remaining = buf.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }

	  // must be an even number of digits
	  var strLen = string.length
	  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

	  if (length > strLen / 2) {
	    length = strLen / 2
	  }
	  for (var i = 0; i < length; i++) {
	    var parsed = parseInt(string.substr(i * 2, 2), 16)
	    if (isNaN(parsed)) throw new Error('Invalid hex string')
	    buf[offset + i] = parsed
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
	}

	function asciiWrite (buf, string, offset, length) {
	  return blitBuffer(asciiToBytes(string), buf, offset, length)
	}

	function binaryWrite (buf, string, offset, length) {
	  return asciiWrite(buf, string, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  return blitBuffer(base64ToBytes(string), buf, offset, length)
	}

	function ucs2Write (buf, string, offset, length) {
	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
	}

	Buffer.prototype.write = function write (string, offset, length, encoding) {
	  // Buffer#write(string)
	  if (offset === undefined) {
	    encoding = 'utf8'
	    length = this.length
	    offset = 0
	  // Buffer#write(string, encoding)
	  } else if (length === undefined && typeof offset === 'string') {
	    encoding = offset
	    length = this.length
	    offset = 0
	  // Buffer#write(string, offset[, length][, encoding])
	  } else if (isFinite(offset)) {
	    offset = offset | 0
	    if (isFinite(length)) {
	      length = length | 0
	      if (encoding === undefined) encoding = 'utf8'
	    } else {
	      encoding = length
	      length = undefined
	    }
	  // legacy write(string, encoding, offset, length) - remove in v0.13
	  } else {
	    var swap = encoding
	    encoding = offset
	    offset = length | 0
	    length = swap
	  }

	  var remaining = this.length - offset
	  if (length === undefined || length > remaining) length = remaining

	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
	    throw new RangeError('attempt to write outside buffer bounds')
	  }

	  if (!encoding) encoding = 'utf8'

	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'hex':
	        return hexWrite(this, string, offset, length)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Write(this, string, offset, length)

	      case 'ascii':
	        return asciiWrite(this, string, offset, length)

	      case 'binary':
	        return binaryWrite(this, string, offset, length)

	      case 'base64':
	        // Warning: maxLength not taken into account in base64Write
	        return base64Write(this, string, offset, length)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return ucs2Write(this, string, offset, length)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toJSON = function toJSON () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	}

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  var res = ''
	  var tmp = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    if (buf[i] <= 0x7F) {
	      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
	      tmp = ''
	    } else {
	      tmp += '%' + buf[i].toString(16)
	    }
	  }

	  return res + decodeUtf8Char(tmp)
	}

	function asciiSlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    ret += String.fromCharCode(buf[i] & 0x7F)
	  }
	  return ret
	}

	function binarySlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    ret += String.fromCharCode(buf[i])
	  }
	  return ret
	}

	function hexSlice (buf, start, end) {
	  var len = buf.length

	  if (!start || start < 0) start = 0
	  if (!end || end < 0 || end > len) end = len

	  var out = ''
	  for (var i = start; i < end; i++) {
	    out += toHex(buf[i])
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  var bytes = buf.slice(start, end)
	  var res = ''
	  for (var i = 0; i < bytes.length; i += 2) {
	    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
	  }
	  return res
	}

	Buffer.prototype.slice = function slice (start, end) {
	  var len = this.length
	  start = ~~start
	  end = end === undefined ? len : ~~end

	  if (start < 0) {
	    start += len
	    if (start < 0) start = 0
	  } else if (start > len) {
	    start = len
	  }

	  if (end < 0) {
	    end += len
	    if (end < 0) end = 0
	  } else if (end > len) {
	    end = len
	  }

	  if (end < start) end = start

	  var newBuf
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    newBuf = Buffer._augment(this.subarray(start, end))
	  } else {
	    var sliceLen = end - start
	    newBuf = new Buffer(sliceLen, undefined)
	    for (var i = 0; i < sliceLen; i++) {
	      newBuf[i] = this[i + start]
	    }
	  }

	  if (newBuf.length) newBuf.parent = this.parent || this

	  return newBuf
	}

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }

	  return val
	}

	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    checkOffset(offset, byteLength, this.length)
	  }

	  var val = this[offset + --byteLength]
	  var mul = 1
	  while (byteLength > 0 && (mul *= 0x100)) {
	    val += this[offset + --byteLength] * mul
	  }

	  return val
	}

	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  return this[offset]
	}

	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return this[offset] | (this[offset + 1] << 8)
	}

	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return (this[offset] << 8) | this[offset + 1]
	}

	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	}

	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] * 0x1000000) +
	    ((this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    this[offset + 3])
	}

	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var i = byteLength
	  var mul = 1
	  var val = this[offset + --i]
	  while (i > 0 && (mul *= 0x100)) {
	    val += this[offset + --i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  if (!(this[offset] & 0x80)) return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	}

	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset] | (this[offset + 1] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset + 1] | (this[offset] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset]) |
	    (this[offset + 1] << 8) |
	    (this[offset + 2] << 16) |
	    (this[offset + 3] << 24)
	}

	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] << 24) |
	    (this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    (this[offset + 3])
	}

	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, true, 23, 4)
	}

	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, false, 23, 4)
	}

	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, true, 52, 8)
	}

	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, false, 52, 8)
	}

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
	  if (value > max || value < min) throw new RangeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('index out of range')
	}

	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

	  var mul = 1
	  var i = 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

	  var i = byteLength - 1
	  var mul = 1
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  this[offset] = value
	  return offset + 1
	}

	function objectWriteUInt16 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
	    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
	      (littleEndian ? i : 1 - i) * 8
	  }
	}

	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = value
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = value
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	function objectWriteUInt32 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffffffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
	    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
	  }
	}

	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset + 3] = (value >>> 24)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 1] = (value >>> 8)
	    this[offset] = value
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = value
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = 0
	  var mul = 1
	  var sub = value < 0 ? 1 : 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = byteLength - 1
	  var mul = 1
	  var sub = value < 0 ? 1 : 0
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  if (value < 0) value = 0xff + value + 1
	  this[offset] = value
	  return offset + 1
	}

	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = value
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = value
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = value
	    this[offset + 1] = (value >>> 8)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 3] = (value >>> 24)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (value < 0) value = 0xffffffff + value + 1
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = value
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (value > max || value < min) throw new RangeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('index out of range')
	  if (offset < 0) throw new RangeError('index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 23, 4)
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	}

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 52, 8)
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	}

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
	  if (!start) start = 0
	  if (!end && end !== 0) end = this.length
	  if (targetStart >= target.length) targetStart = target.length
	  if (!targetStart) targetStart = 0
	  if (end > 0 && end < start) end = start

	  // Copy 0 bytes; we're done
	  if (end === start) return 0
	  if (target.length === 0 || this.length === 0) return 0

	  // Fatal error conditions
	  if (targetStart < 0) {
	    throw new RangeError('targetStart out of bounds')
	  }
	  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length) end = this.length
	  if (target.length - targetStart < end - start) {
	    end = target.length - targetStart + start
	  }

	  var len = end - start

	  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
	    for (var i = 0; i < len; i++) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else {
	    target._set(this.subarray(start, start + len), targetStart)
	  }

	  return len
	}

	// fill(value, start=0, end=buffer.length)
	Buffer.prototype.fill = function fill (value, start, end) {
	  if (!value) value = 0
	  if (!start) start = 0
	  if (!end) end = this.length

	  if (end < start) throw new RangeError('end < start')

	  // Fill 0 bytes; we're done
	  if (end === start) return
	  if (this.length === 0) return

	  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
	  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

	  var i
	  if (typeof value === 'number') {
	    for (i = start; i < end; i++) {
	      this[i] = value
	    }
	  } else {
	    var bytes = utf8ToBytes(value.toString())
	    var len = bytes.length
	    for (i = start; i < end; i++) {
	      this[i] = bytes[i % len]
	    }
	  }

	  return this
	}

	/**
	 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
	 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
	 */
	Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
	  if (typeof Uint8Array !== 'undefined') {
	    if (Buffer.TYPED_ARRAY_SUPPORT) {
	      return (new Buffer(this)).buffer
	    } else {
	      var buf = new Uint8Array(this.length)
	      for (var i = 0, len = buf.length; i < len; i += 1) {
	        buf[i] = this[i]
	      }
	      return buf.buffer
	    }
	  } else {
	    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
	  }
	}

	// HELPER FUNCTIONS
	// ================

	var BP = Buffer.prototype

	/**
	 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
	 */
	Buffer._augment = function _augment (arr) {
	  arr.constructor = Buffer
	  arr._isBuffer = true

	  // save reference to original Uint8Array set method before overwriting
	  arr._set = arr.set

	  // deprecated, will be removed in node 0.13+
	  arr.get = BP.get
	  arr.set = BP.set

	  arr.write = BP.write
	  arr.toString = BP.toString
	  arr.toLocaleString = BP.toString
	  arr.toJSON = BP.toJSON
	  arr.equals = BP.equals
	  arr.compare = BP.compare
	  arr.indexOf = BP.indexOf
	  arr.copy = BP.copy
	  arr.slice = BP.slice
	  arr.readUIntLE = BP.readUIntLE
	  arr.readUIntBE = BP.readUIntBE
	  arr.readUInt8 = BP.readUInt8
	  arr.readUInt16LE = BP.readUInt16LE
	  arr.readUInt16BE = BP.readUInt16BE
	  arr.readUInt32LE = BP.readUInt32LE
	  arr.readUInt32BE = BP.readUInt32BE
	  arr.readIntLE = BP.readIntLE
	  arr.readIntBE = BP.readIntBE
	  arr.readInt8 = BP.readInt8
	  arr.readInt16LE = BP.readInt16LE
	  arr.readInt16BE = BP.readInt16BE
	  arr.readInt32LE = BP.readInt32LE
	  arr.readInt32BE = BP.readInt32BE
	  arr.readFloatLE = BP.readFloatLE
	  arr.readFloatBE = BP.readFloatBE
	  arr.readDoubleLE = BP.readDoubleLE
	  arr.readDoubleBE = BP.readDoubleBE
	  arr.writeUInt8 = BP.writeUInt8
	  arr.writeUIntLE = BP.writeUIntLE
	  arr.writeUIntBE = BP.writeUIntBE
	  arr.writeUInt16LE = BP.writeUInt16LE
	  arr.writeUInt16BE = BP.writeUInt16BE
	  arr.writeUInt32LE = BP.writeUInt32LE
	  arr.writeUInt32BE = BP.writeUInt32BE
	  arr.writeIntLE = BP.writeIntLE
	  arr.writeIntBE = BP.writeIntBE
	  arr.writeInt8 = BP.writeInt8
	  arr.writeInt16LE = BP.writeInt16LE
	  arr.writeInt16BE = BP.writeInt16BE
	  arr.writeInt32LE = BP.writeInt32LE
	  arr.writeInt32BE = BP.writeInt32BE
	  arr.writeFloatLE = BP.writeFloatLE
	  arr.writeFloatBE = BP.writeFloatBE
	  arr.writeDoubleLE = BP.writeDoubleLE
	  arr.writeDoubleBE = BP.writeDoubleBE
	  arr.fill = BP.fill
	  arr.inspect = BP.inspect
	  arr.toArrayBuffer = BP.toArrayBuffer

	  return arr
	}

	var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

	function base64clean (str) {
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
	  // Node converts strings with length < 2 to ''
	  if (str.length < 2) return ''
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '='
	  }
	  return str
	}

	function stringtrim (str) {
	  if (str.trim) return str.trim()
	  return str.replace(/^\s+|\s+$/g, '')
	}

	function toHex (n) {
	  if (n < 16) return '0' + n.toString(16)
	  return n.toString(16)
	}

	function utf8ToBytes (string, units) {
	  units = units || Infinity
	  var codePoint
	  var length = string.length
	  var leadSurrogate = null
	  var bytes = []
	  var i = 0

	  for (; i < length; i++) {
	    codePoint = string.charCodeAt(i)

	    // is surrogate component
	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
	      // last char was a lead
	      if (leadSurrogate) {
	        // 2 leads in a row
	        if (codePoint < 0xDC00) {
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          leadSurrogate = codePoint
	          continue
	        } else {
	          // valid surrogate pair
	          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
	          leadSurrogate = null
	        }
	      } else {
	        // no lead yet

	        if (codePoint > 0xDBFF) {
	          // unexpected trail
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        } else if (i + 1 === length) {
	          // unpaired lead
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        } else {
	          // valid lead
	          leadSurrogate = codePoint
	          continue
	        }
	      }
	    } else if (leadSurrogate) {
	      // valid bmp char, but last char was a lead
	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	      leadSurrogate = null
	    }

	    // encode utf8
	    if (codePoint < 0x80) {
	      if ((units -= 1) < 0) break
	      bytes.push(codePoint)
	    } else if (codePoint < 0x800) {
	      if ((units -= 2) < 0) break
	      bytes.push(
	        codePoint >> 0x6 | 0xC0,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x10000) {
	      if ((units -= 3) < 0) break
	      bytes.push(
	        codePoint >> 0xC | 0xE0,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x200000) {
	      if ((units -= 4) < 0) break
	      bytes.push(
	        codePoint >> 0x12 | 0xF0,
	        codePoint >> 0xC & 0x3F | 0x80,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else {
	      throw new Error('Invalid code point')
	    }
	  }

	  return bytes
	}

	function asciiToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF)
	  }
	  return byteArray
	}

	function utf16leToBytes (str, units) {
	  var c, hi, lo
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    if ((units -= 2) < 0) break

	    c = str.charCodeAt(i)
	    hi = c >> 8
	    lo = c % 256
	    byteArray.push(lo)
	    byteArray.push(hi)
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(base64clean(str))
	}

	function blitBuffer (src, dst, offset, length) {
	  for (var i = 0; i < length; i++) {
	    if ((i + offset >= dst.length) || (i >= src.length)) break
	    dst[i + offset] = src[i]
	  }
	  return i
	}

	function decodeUtf8Char (str) {
	  try {
	    return decodeURIComponent(str)
	  } catch (err) {
	    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
	  }
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(23).Buffer))

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	;(function (exports) {
		'use strict';

	  var Arr = (typeof Uint8Array !== 'undefined')
	    ? Uint8Array
	    : Array

		var PLUS   = '+'.charCodeAt(0)
		var SLASH  = '/'.charCodeAt(0)
		var NUMBER = '0'.charCodeAt(0)
		var LOWER  = 'a'.charCodeAt(0)
		var UPPER  = 'A'.charCodeAt(0)
		var PLUS_URL_SAFE = '-'.charCodeAt(0)
		var SLASH_URL_SAFE = '_'.charCodeAt(0)

		function decode (elt) {
			var code = elt.charCodeAt(0)
			if (code === PLUS ||
			    code === PLUS_URL_SAFE)
				return 62 // '+'
			if (code === SLASH ||
			    code === SLASH_URL_SAFE)
				return 63 // '/'
			if (code < NUMBER)
				return -1 //no match
			if (code < NUMBER + 10)
				return code - NUMBER + 26 + 26
			if (code < UPPER + 26)
				return code - UPPER
			if (code < LOWER + 26)
				return code - LOWER + 26
		}

		function b64ToByteArray (b64) {
			var i, j, l, tmp, placeHolders, arr

			if (b64.length % 4 > 0) {
				throw new Error('Invalid string. Length must be a multiple of 4')
			}

			// the number of equal signs (place holders)
			// if there are two placeholders, than the two characters before it
			// represent one byte
			// if there is only one, then the three characters before it represent 2 bytes
			// this is just a cheap hack to not do indexOf twice
			var len = b64.length
			placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

			// base64 is 4/3 + up to two characters of the original data
			arr = new Arr(b64.length * 3 / 4 - placeHolders)

			// if there are placeholders, only get up to the last complete 4 chars
			l = placeHolders > 0 ? b64.length - 4 : b64.length

			var L = 0

			function push (v) {
				arr[L++] = v
			}

			for (i = 0, j = 0; i < l; i += 4, j += 3) {
				tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
				push((tmp & 0xFF0000) >> 16)
				push((tmp & 0xFF00) >> 8)
				push(tmp & 0xFF)
			}

			if (placeHolders === 2) {
				tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
				push(tmp & 0xFF)
			} else if (placeHolders === 1) {
				tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
				push((tmp >> 8) & 0xFF)
				push(tmp & 0xFF)
			}

			return arr
		}

		function uint8ToBase64 (uint8) {
			var i,
				extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
				output = "",
				temp, length

			function encode (num) {
				return lookup.charAt(num)
			}

			function tripletToBase64 (num) {
				return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
			}

			// go through the array every three bytes, we'll deal with trailing stuff later
			for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
				temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
				output += tripletToBase64(temp)
			}

			// pad the end with zeros, but make sure to not forget the extra bytes
			switch (extraBytes) {
				case 1:
					temp = uint8[uint8.length - 1]
					output += encode(temp >> 2)
					output += encode((temp << 4) & 0x3F)
					output += '=='
					break
				case 2:
					temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
					output += encode(temp >> 10)
					output += encode((temp >> 4) & 0x3F)
					output += encode((temp << 2) & 0x3F)
					output += '='
					break
			}

			return output
		}

		exports.toByteArray = b64ToByteArray
		exports.fromByteArray = uint8ToBase64
	}(false ? (this.base64js = {}) : exports))


/***/ },
/* 25 */
/***/ function(module, exports) {

	exports.read = function (buffer, offset, isLE, mLen, nBytes) {
	  var e, m
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var nBits = -7
	  var i = isLE ? (nBytes - 1) : 0
	  var d = isLE ? -1 : 1
	  var s = buffer[offset + i]

	  i += d

	  e = s & ((1 << (-nBits)) - 1)
	  s >>= (-nBits)
	  nBits += eLen
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1)
	  e >>= (-nBits)
	  nBits += mLen
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen)
	    e = e - eBias
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	}

	exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
	  var i = isLE ? 0 : (nBytes - 1)
	  var d = isLE ? 1 : -1
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

	  value = Math.abs(value)

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0
	    e = eMax
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2)
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--
	      c *= 2
	    }
	    if (e + eBias >= 1) {
	      value += rt / c
	    } else {
	      value += rt * Math.pow(2, 1 - eBias)
	    }
	    if (value * c >= 2) {
	      e++
	      c /= 2
	    }

	    if (e + eBias >= eMax) {
	      m = 0
	      e = eMax
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen)
	      e = e + eBias
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
	      e = 0
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m
	  eLen += mLen
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128
	}


/***/ },
/* 26 */
/***/ function(module, exports) {

	
	/**
	 * isArray
	 */

	var isArray = Array.isArray;

	/**
	 * toString
	 */

	var str = Object.prototype.toString;

	/**
	 * Whether or not the given `val`
	 * is an array.
	 *
	 * example:
	 *
	 *        isArray([]);
	 *        // > true
	 *        isArray(arguments);
	 *        // > false
	 *        isArray('');
	 *        // > false
	 *
	 * @param {mixed} val
	 * @return {bool}
	 */

	module.exports = isArray || function (val) {
	  return !! val && '[object Array]' == str.call(val);
	};


/***/ },
/* 27 */
/***/ function(module, exports) {

	/**
	 * Bit twiddling hacks for JavaScript.
	 *
	 * Author: Mikola Lysenko
	 *
	 * Ported from Stanford bit twiddling hack library:
	 *    http://graphics.stanford.edu/~seander/bithacks.html
	 */

	"use strict"; "use restrict";

	//Number of bits in an integer
	var INT_BITS = 32;

	//Constants
	exports.INT_BITS  = INT_BITS;
	exports.INT_MAX   =  0x7fffffff;
	exports.INT_MIN   = -1<<(INT_BITS-1);

	//Returns -1, 0, +1 depending on sign of x
	exports.sign = function(v) {
	  return (v > 0) - (v < 0);
	}

	//Computes absolute value of integer
	exports.abs = function(v) {
	  var mask = v >> (INT_BITS-1);
	  return (v ^ mask) - mask;
	}

	//Computes minimum of integers x and y
	exports.min = function(x, y) {
	  return y ^ ((x ^ y) & -(x < y));
	}

	//Computes maximum of integers x and y
	exports.max = function(x, y) {
	  return x ^ ((x ^ y) & -(x < y));
	}

	//Checks if a number is a power of two
	exports.isPow2 = function(v) {
	  return !(v & (v-1)) && (!!v);
	}

	//Computes log base 2 of v
	exports.log2 = function(v) {
	  var r, shift;
	  r =     (v > 0xFFFF) << 4; v >>>= r;
	  shift = (v > 0xFF  ) << 3; v >>>= shift; r |= shift;
	  shift = (v > 0xF   ) << 2; v >>>= shift; r |= shift;
	  shift = (v > 0x3   ) << 1; v >>>= shift; r |= shift;
	  return r | (v >> 1);
	}

	//Computes log base 10 of v
	exports.log10 = function(v) {
	  return  (v >= 1000000000) ? 9 : (v >= 100000000) ? 8 : (v >= 10000000) ? 7 :
	          (v >= 1000000) ? 6 : (v >= 100000) ? 5 : (v >= 10000) ? 4 :
	          (v >= 1000) ? 3 : (v >= 100) ? 2 : (v >= 10) ? 1 : 0;
	}

	//Counts number of bits
	exports.popCount = function(v) {
	  v = v - ((v >>> 1) & 0x55555555);
	  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
	  return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
	}

	//Counts number of trailing zeros
	function countTrailingZeros(v) {
	  var c = 32;
	  v &= -v;
	  if (v) c--;
	  if (v & 0x0000FFFF) c -= 16;
	  if (v & 0x00FF00FF) c -= 8;
	  if (v & 0x0F0F0F0F) c -= 4;
	  if (v & 0x33333333) c -= 2;
	  if (v & 0x55555555) c -= 1;
	  return c;
	}
	exports.countTrailingZeros = countTrailingZeros;

	//Rounds to next power of 2
	exports.nextPow2 = function(v) {
	  v += v === 0;
	  --v;
	  v |= v >>> 1;
	  v |= v >>> 2;
	  v |= v >>> 4;
	  v |= v >>> 8;
	  v |= v >>> 16;
	  return v + 1;
	}

	//Rounds down to previous power of 2
	exports.prevPow2 = function(v) {
	  v |= v >>> 1;
	  v |= v >>> 2;
	  v |= v >>> 4;
	  v |= v >>> 8;
	  v |= v >>> 16;
	  return v - (v>>>1);
	}

	//Computes parity of word
	exports.parity = function(v) {
	  v ^= v >>> 16;
	  v ^= v >>> 8;
	  v ^= v >>> 4;
	  v &= 0xf;
	  return (0x6996 >>> v) & 1;
	}

	var REVERSE_TABLE = new Array(256);

	(function(tab) {
	  for(var i=0; i<256; ++i) {
	    var v = i, r = i, s = 7;
	    for (v >>>= 1; v; v >>>= 1) {
	      r <<= 1;
	      r |= v & 1;
	      --s;
	    }
	    tab[i] = (r << s) & 0xff;
	  }
	})(REVERSE_TABLE);

	//Reverse bits in a 32 bit word
	exports.reverse = function(v) {
	  return  (REVERSE_TABLE[ v         & 0xff] << 24) |
	          (REVERSE_TABLE[(v >>> 8)  & 0xff] << 16) |
	          (REVERSE_TABLE[(v >>> 16) & 0xff] << 8)  |
	           REVERSE_TABLE[(v >>> 24) & 0xff];
	}

	//Interleave bits of 2 coordinates with 16 bits.  Useful for fast quadtree codes
	exports.interleave2 = function(x, y) {
	  x &= 0xFFFF;
	  x = (x | (x << 8)) & 0x00FF00FF;
	  x = (x | (x << 4)) & 0x0F0F0F0F;
	  x = (x | (x << 2)) & 0x33333333;
	  x = (x | (x << 1)) & 0x55555555;

	  y &= 0xFFFF;
	  y = (y | (y << 8)) & 0x00FF00FF;
	  y = (y | (y << 4)) & 0x0F0F0F0F;
	  y = (y | (y << 2)) & 0x33333333;
	  y = (y | (y << 1)) & 0x55555555;

	  return x | (y << 1);
	}

	//Extracts the nth interleaved component
	exports.deinterleave2 = function(v, n) {
	  v = (v >>> n) & 0x55555555;
	  v = (v | (v >>> 1))  & 0x33333333;
	  v = (v | (v >>> 2))  & 0x0F0F0F0F;
	  v = (v | (v >>> 4))  & 0x00FF00FF;
	  v = (v | (v >>> 16)) & 0x000FFFF;
	  return (v << 16) >> 16;
	}


	//Interleave bits of 3 coordinates, each with 10 bits.  Useful for fast octree codes
	exports.interleave3 = function(x, y, z) {
	  x &= 0x3FF;
	  x  = (x | (x<<16)) & 4278190335;
	  x  = (x | (x<<8))  & 251719695;
	  x  = (x | (x<<4))  & 3272356035;
	  x  = (x | (x<<2))  & 1227133513;

	  y &= 0x3FF;
	  y  = (y | (y<<16)) & 4278190335;
	  y  = (y | (y<<8))  & 251719695;
	  y  = (y | (y<<4))  & 3272356035;
	  y  = (y | (y<<2))  & 1227133513;
	  x |= (y << 1);
	  
	  z &= 0x3FF;
	  z  = (z | (z<<16)) & 4278190335;
	  z  = (z | (z<<8))  & 251719695;
	  z  = (z | (z<<4))  & 3272356035;
	  z  = (z | (z<<2))  & 1227133513;
	  
	  return x | (z << 2);
	}

	//Extracts nth interleaved component of a 3-tuple
	exports.deinterleave3 = function(v, n) {
	  v = (v >>> n)       & 1227133513;
	  v = (v | (v>>>2))   & 3272356035;
	  v = (v | (v>>>4))   & 251719695;
	  v = (v | (v>>>8))   & 4278190335;
	  v = (v | (v>>>16))  & 0x3FF;
	  return (v<<22)>>22;
	}

	//Computes next combination in colexicographic order (this is mistakenly called nextPermutation on the bit twiddling hacks page)
	exports.nextCombination = function(v) {
	  var t = v | (v - 1);
	  return (t + 1) | (((~t & -~t) - 1) >>> (countTrailingZeros(v) + 1));
	}



/***/ },
/* 28 */
/***/ function(module, exports) {

	"use strict"

	function dupe_array(count, value, i) {
	  var c = count[i]|0
	  if(c <= 0) {
	    return []
	  }
	  var result = new Array(c), j
	  if(i === count.length-1) {
	    for(j=0; j<c; ++j) {
	      result[j] = value
	    }
	  } else {
	    for(j=0; j<c; ++j) {
	      result[j] = dupe_array(count, value, i+1)
	    }
	  }
	  return result
	}

	function dupe_number(count, value) {
	  var result, i
	  result = new Array(count)
	  for(i=0; i<count; ++i) {
	    result[i] = value
	  }
	  return result
	}

	function dupe(count, value) {
	  if(typeof value === "undefined") {
	    value = 0
	  }
	  switch(typeof count) {
	    case "number":
	      if(count > 0) {
	        return dupe_number(count|0, value)
	      }
	    break
	    case "object":
	      if(typeof (count.length) === "number") {
	        return dupe_array(count, value, 0)
	      }
	    break
	  }
	  return []
	}

	module.exports = dupe

/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	var iota = __webpack_require__(30)
	var isBuffer = __webpack_require__(31)

	var hasTypedArrays  = ((typeof Float64Array) !== "undefined")

	function compare1st(a, b) {
	  return a[0] - b[0]
	}

	function order() {
	  var stride = this.stride
	  var terms = new Array(stride.length)
	  var i
	  for(i=0; i<terms.length; ++i) {
	    terms[i] = [Math.abs(stride[i]), i]
	  }
	  terms.sort(compare1st)
	  var result = new Array(terms.length)
	  for(i=0; i<result.length; ++i) {
	    result[i] = terms[i][1]
	  }
	  return result
	}

	function compileConstructor(dtype, dimension) {
	  var className = ["View", dimension, "d", dtype].join("")
	  if(dimension < 0) {
	    className = "View_Nil" + dtype
	  }
	  var useGetters = (dtype === "generic")

	  if(dimension === -1) {
	    //Special case for trivial arrays
	    var code =
	      "function "+className+"(a){this.data=a;};\
	var proto="+className+".prototype;\
	proto.dtype='"+dtype+"';\
	proto.index=function(){return -1};\
	proto.size=0;\
	proto.dimension=-1;\
	proto.shape=proto.stride=proto.order=[];\
	proto.lo=proto.hi=proto.transpose=proto.step=\
	function(){return new "+className+"(this.data);};\
	proto.get=proto.set=function(){};\
	proto.pick=function(){return null};\
	return function construct_"+className+"(a){return new "+className+"(a);}"
	    var procedure = new Function(code)
	    return procedure()
	  } else if(dimension === 0) {
	    //Special case for 0d arrays
	    var code =
	      "function "+className+"(a,d) {\
	this.data = a;\
	this.offset = d\
	};\
	var proto="+className+".prototype;\
	proto.dtype='"+dtype+"';\
	proto.index=function(){return this.offset};\
	proto.dimension=0;\
	proto.size=1;\
	proto.shape=\
	proto.stride=\
	proto.order=[];\
	proto.lo=\
	proto.hi=\
	proto.transpose=\
	proto.step=function "+className+"_copy() {\
	return new "+className+"(this.data,this.offset)\
	};\
	proto.pick=function "+className+"_pick(){\
	return TrivialArray(this.data);\
	};\
	proto.valueOf=proto.get=function "+className+"_get(){\
	return "+(useGetters ? "this.data.get(this.offset)" : "this.data[this.offset]")+
	"};\
	proto.set=function "+className+"_set(v){\
	return "+(useGetters ? "this.data.set(this.offset,v)" : "this.data[this.offset]=v")+"\
	};\
	return function construct_"+className+"(a,b,c,d){return new "+className+"(a,d)}"
	    var procedure = new Function("TrivialArray", code)
	    return procedure(CACHED_CONSTRUCTORS[dtype][0])
	  }

	  var code = ["'use strict'"]

	  //Create constructor for view
	  var indices = iota(dimension)
	  var args = indices.map(function(i) { return "i"+i })
	  var index_str = "this.offset+" + indices.map(function(i) {
	        return "this.stride[" + i + "]*i" + i
	      }).join("+")
	  var shapeArg = indices.map(function(i) {
	      return "b"+i
	    }).join(",")
	  var strideArg = indices.map(function(i) {
	      return "c"+i
	    }).join(",")
	  code.push(
	    "function "+className+"(a," + shapeArg + "," + strideArg + ",d){this.data=a",
	      "this.shape=[" + shapeArg + "]",
	      "this.stride=[" + strideArg + "]",
	      "this.offset=d|0}",
	    "var proto="+className+".prototype",
	    "proto.dtype='"+dtype+"'",
	    "proto.dimension="+dimension)

	  //view.size:
	  code.push("Object.defineProperty(proto,'size',{get:function "+className+"_size(){\
	return "+indices.map(function(i) { return "this.shape["+i+"]" }).join("*"),
	"}})")

	  //view.order:
	  if(dimension === 1) {
	    code.push("proto.order=[0]")
	  } else {
	    code.push("Object.defineProperty(proto,'order',{get:")
	    if(dimension < 4) {
	      code.push("function "+className+"_order(){")
	      if(dimension === 2) {
	        code.push("return (Math.abs(this.stride[0])>Math.abs(this.stride[1]))?[1,0]:[0,1]}})")
	      } else if(dimension === 3) {
	        code.push(
	"var s0=Math.abs(this.stride[0]),s1=Math.abs(this.stride[1]),s2=Math.abs(this.stride[2]);\
	if(s0>s1){\
	if(s1>s2){\
	return [2,1,0];\
	}else if(s0>s2){\
	return [1,2,0];\
	}else{\
	return [1,0,2];\
	}\
	}else if(s0>s2){\
	return [2,0,1];\
	}else if(s2>s1){\
	return [0,1,2];\
	}else{\
	return [0,2,1];\
	}}})")
	      }
	    } else {
	      code.push("ORDER})")
	    }
	  }

	  //view.set(i0, ..., v):
	  code.push(
	"proto.set=function "+className+"_set("+args.join(",")+",v){")
	  if(useGetters) {
	    code.push("return this.data.set("+index_str+",v)}")
	  } else {
	    code.push("return this.data["+index_str+"]=v}")
	  }

	  //view.get(i0, ...):
	  code.push("proto.get=function "+className+"_get("+args.join(",")+"){")
	  if(useGetters) {
	    code.push("return this.data.get("+index_str+")}")
	  } else {
	    code.push("return this.data["+index_str+"]}")
	  }

	  //view.index:
	  code.push(
	    "proto.index=function "+className+"_index(", args.join(), "){return "+index_str+"}")

	  //view.hi():
	  code.push("proto.hi=function "+className+"_hi("+args.join(",")+"){return new "+className+"(this.data,"+
	    indices.map(function(i) {
	      return ["(typeof i",i,"!=='number'||i",i,"<0)?this.shape[", i, "]:i", i,"|0"].join("")
	    }).join(",")+","+
	    indices.map(function(i) {
	      return "this.stride["+i + "]"
	    }).join(",")+",this.offset)}")

	  //view.lo():
	  var a_vars = indices.map(function(i) { return "a"+i+"=this.shape["+i+"]" })
	  var c_vars = indices.map(function(i) { return "c"+i+"=this.stride["+i+"]" })
	  code.push("proto.lo=function "+className+"_lo("+args.join(",")+"){var b=this.offset,d=0,"+a_vars.join(",")+","+c_vars.join(","))
	  for(var i=0; i<dimension; ++i) {
	    code.push(
	"if(typeof i"+i+"==='number'&&i"+i+">=0){\
	d=i"+i+"|0;\
	b+=c"+i+"*d;\
	a"+i+"-=d}")
	  }
	  code.push("return new "+className+"(this.data,"+
	    indices.map(function(i) {
	      return "a"+i
	    }).join(",")+","+
	    indices.map(function(i) {
	      return "c"+i
	    }).join(",")+",b)}")

	  //view.step():
	  code.push("proto.step=function "+className+"_step("+args.join(",")+"){var "+
	    indices.map(function(i) {
	      return "a"+i+"=this.shape["+i+"]"
	    }).join(",")+","+
	    indices.map(function(i) {
	      return "b"+i+"=this.stride["+i+"]"
	    }).join(",")+",c=this.offset,d=0,ceil=Math.ceil")
	  for(var i=0; i<dimension; ++i) {
	    code.push(
	"if(typeof i"+i+"==='number'){\
	d=i"+i+"|0;\
	if(d<0){\
	c+=b"+i+"*(a"+i+"-1);\
	a"+i+"=ceil(-a"+i+"/d)\
	}else{\
	a"+i+"=ceil(a"+i+"/d)\
	}\
	b"+i+"*=d\
	}")
	  }
	  code.push("return new "+className+"(this.data,"+
	    indices.map(function(i) {
	      return "a" + i
	    }).join(",")+","+
	    indices.map(function(i) {
	      return "b" + i
	    }).join(",")+",c)}")

	  //view.transpose():
	  var tShape = new Array(dimension)
	  var tStride = new Array(dimension)
	  for(var i=0; i<dimension; ++i) {
	    tShape[i] = "a[i"+i+"]"
	    tStride[i] = "b[i"+i+"]"
	  }
	  code.push("proto.transpose=function "+className+"_transpose("+args+"){"+
	    args.map(function(n,idx) { return n + "=(" + n + "===undefined?" + idx + ":" + n + "|0)"}).join(";"),
	    "var a=this.shape,b=this.stride;return new "+className+"(this.data,"+tShape.join(",")+","+tStride.join(",")+",this.offset)}")

	  //view.pick():
	  code.push("proto.pick=function "+className+"_pick("+args+"){var a=[],b=[],c=this.offset")
	  for(var i=0; i<dimension; ++i) {
	    code.push("if(typeof i"+i+"==='number'&&i"+i+">=0){c=(c+this.stride["+i+"]*i"+i+")|0}else{a.push(this.shape["+i+"]);b.push(this.stride["+i+"])}")
	  }
	  code.push("var ctor=CTOR_LIST[a.length+1];return ctor(this.data,a,b,c)}")

	  //Add return statement
	  code.push("return function construct_"+className+"(data,shape,stride,offset){return new "+className+"(data,"+
	    indices.map(function(i) {
	      return "shape["+i+"]"
	    }).join(",")+","+
	    indices.map(function(i) {
	      return "stride["+i+"]"
	    }).join(",")+",offset)}")

	  //Compile procedure
	  var procedure = new Function("CTOR_LIST", "ORDER", code.join("\n"))
	  return procedure(CACHED_CONSTRUCTORS[dtype], order)
	}

	function arrayDType(data) {
	  if(isBuffer(data)) {
	    return "buffer"
	  }
	  if(hasTypedArrays) {
	    switch(Object.prototype.toString.call(data)) {
	      case "[object Float64Array]":
	        return "float64"
	      case "[object Float32Array]":
	        return "float32"
	      case "[object Int8Array]":
	        return "int8"
	      case "[object Int16Array]":
	        return "int16"
	      case "[object Int32Array]":
	        return "int32"
	      case "[object Uint8Array]":
	        return "uint8"
	      case "[object Uint16Array]":
	        return "uint16"
	      case "[object Uint32Array]":
	        return "uint32"
	      case "[object Uint8ClampedArray]":
	        return "uint8_clamped"
	    }
	  }
	  if(Array.isArray(data)) {
	    return "array"
	  }
	  return "generic"
	}

	var CACHED_CONSTRUCTORS = {
	  "float32":[],
	  "float64":[],
	  "int8":[],
	  "int16":[],
	  "int32":[],
	  "uint8":[],
	  "uint16":[],
	  "uint32":[],
	  "array":[],
	  "uint8_clamped":[],
	  "buffer":[],
	  "generic":[]
	}

	;(function() {
	  for(var id in CACHED_CONSTRUCTORS) {
	    CACHED_CONSTRUCTORS[id].push(compileConstructor(id, -1))
	  }
	});

	function wrappedNDArrayCtor(data, shape, stride, offset) {
	  if(data === undefined) {
	    var ctor = CACHED_CONSTRUCTORS.array[0]
	    return ctor([])
	  } else if(typeof data === "number") {
	    data = [data]
	  }
	  if(shape === undefined) {
	    shape = [ data.length ]
	  }
	  var d = shape.length
	  if(stride === undefined) {
	    stride = new Array(d)
	    for(var i=d-1, sz=1; i>=0; --i) {
	      stride[i] = sz
	      sz *= shape[i]
	    }
	  }
	  if(offset === undefined) {
	    offset = 0
	    for(var i=0; i<d; ++i) {
	      if(stride[i] < 0) {
	        offset -= (shape[i]-1)*stride[i]
	      }
	    }
	  }
	  var dtype = arrayDType(data)
	  var ctor_list = CACHED_CONSTRUCTORS[dtype]
	  while(ctor_list.length <= d+1) {
	    ctor_list.push(compileConstructor(dtype, ctor_list.length-1))
	  }
	  var ctor = ctor_list[d+1]
	  return ctor(data, shape, stride, offset)
	}

	module.exports = wrappedNDArrayCtor


/***/ },
/* 30 */
/***/ function(module, exports) {

	"use strict"

	function iota(n) {
	  var result = new Array(n)
	  for(var i=0; i<n; ++i) {
	    result[i] = i
	  }
	  return result
	}

	module.exports = iota

/***/ },
/* 31 */
/***/ function(module, exports) {

	/**
	 * Determine if an object is Buffer
	 *
	 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * License:  MIT
	 *
	 * `npm install is-buffer`
	 */

	module.exports = function (obj) {
	  return !!(
	    obj != null &&
	    obj.constructor &&
	    typeof obj.constructor.isBuffer === 'function' &&
	    obj.constructor.isBuffer(obj)
	  )
	}


/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	var packColor = __webpack_require__(33).colorToFloat

	module.exports = function colorToFloat(rgba) {
	    return packColor(
	        ~~(rgba[0] * 255),
	        ~~(rgba[1] * 255),
	        ~~(rgba[2] * 255),
	        ~~(rgba[3] * 255)
	    )
	}

/***/ },
/* 33 */
/***/ function(module, exports) {

	var int8 = new Int8Array(4);
	var int32 = new Int32Array(int8.buffer, 0, 1);
	var float32 = new Float32Array(int8.buffer, 0, 1);

	/**
	 * A singleton for number utilities. 
	 * @class NumberUtil
	 */
	var NumberUtil = function() {

	};


	/**
	 * Returns a float representation of the given int bits. ArrayBuffer
	 * is used for the conversion.
	 *
	 * @method  intBitsToFloat
	 * @static
	 * @param  {Number} i the int to cast
	 * @return {Number}   the float
	 */
	NumberUtil.intBitsToFloat = function(i) {
		int32[0] = i;
		return float32[0];
	};

	/**
	 * Returns the int bits from the given float. ArrayBuffer is used
	 * for the conversion.
	 *
	 * @method  floatToIntBits
	 * @static
	 * @param  {Number} f the float to cast
	 * @return {Number}   the int bits
	 */
	NumberUtil.floatToIntBits = function(f) {
		float32[0] = f;
		return int32[0];
	};

	/**
	 * Encodes ABGR int as a float, with slight precision loss.
	 *
	 * @method  intToFloatColor
	 * @static
	 * @param {Number} value an ABGR packed integer
	 */
	NumberUtil.intToFloatColor = function(value) {
		return NumberUtil.intBitsToFloat( value & 0xfeffffff );
	};

	/**
	 * Returns a float encoded ABGR value from the given RGBA
	 * bytes (0 - 255). Useful for saving bandwidth in vertex data.
	 *
	 * @method  colorToFloat
	 * @static
	 * @param {Number} r the Red byte (0 - 255)
	 * @param {Number} g the Green byte (0 - 255)
	 * @param {Number} b the Blue byte (0 - 255)
	 * @param {Number} a the Alpha byte (0 - 255)
	 * @return {Float32}  a Float32 of the RGBA color
	 */
	NumberUtil.colorToFloat = function(r, g, b, a) {
		var bits = (a << 24 | b << 16 | g << 8 | r);
		return NumberUtil.intToFloatColor(bits);
	};

	/**
	 * Returns true if the number is a power-of-two.
	 *
	 * @method  isPowerOfTwo
	 * @param  {Number}  n the number to test
	 * @return {Boolean}   true if power-of-two
	 */
	NumberUtil.isPowerOfTwo = function(n) {
		return (n & (n - 1)) === 0;
	};

	/**
	 * Returns the next highest power-of-two from the specified number. 
	 * 
	 * @param  {Number} n the number to test
	 * @return {Number}   the next highest power of two
	 */
	NumberUtil.nextPowerOfTwo = function(n) {
		n--;
		n |= n >> 1;
		n |= n >> 2;
		n |= n >> 4;
		n |= n >> 8;
		n |= n >> 16;
		return n+1;
	};

	module.exports = NumberUtil;

/***/ },
/* 34 */
/***/ function(module, exports) {

	function premultiply(rgba, out) {
		if (!out || typeof out === 'number')
			out = [0,0,0,0]
		out[0] = rgba[0] * rgba[3]
		out[1] = rgba[1] * rgba[3]
		out[2] = rgba[2] * rgba[3]
		out[3] = rgba[3]
		return out
	}
	module.exports = premultiply

/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	var createVAO = __webpack_require__(36) //TODO: improve this with gl-vao
	var createBuffer = __webpack_require__(39)

	module.exports.floatsPerVertex = 5

	function createIndices(capacity) {
	    var numIndices = capacity * 6
	    var indices = new Uint16Array(numIndices)

	    for (var i = 0, j = 0; i < numIndices; i += 6, j += 4) {
	        indices[i + 0] = j + 0
	        indices[i + 1] = j + 1
	        indices[i + 2] = j + 2
	        indices[i + 3] = j + 0
	        indices[i + 4] = j + 2
	        indices[i + 5] = j + 3
	    }
	    return indices
	}

	module.exports.mixins = {

	    create: function create(opt) {
	        opt = opt||{}
	        this.clear()

	        //dispose before building...
	        if (this.vao)
	            this.dispose()

	        var capacity = typeof opt.capacity === 'number' ? opt.capacity : 100

	        // 65535 is max index, so 65535 / 6 = 10922.
	        if (capacity > 10922)
	            throw new Error("Can't have more than 10922 quads per batch: " + capacity)

	        this._capacity = capacity

	        //the total number of floats in our batch
	        var numVerts = capacity * 4 * module.exports.floatsPerVertex

	        this.vertices = new Float32Array(numVerts)
	        this.indices = createIndices(capacity)

	        var gl = this.gl
	        var usage = opt.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW
	        this.vertexBuffer = createBuffer(gl, this.vertices, gl.ARRAY_BUFFER, usage)
	        this.indexBuffer = createBuffer(gl, this.indices, gl.ELEMENT_ARRAY_BUFFER, gl.STATIC_DRAW)

	        var stride = 5 * 4
	        this.vao = createVAO(gl, [{ //position XY
	            name: 'position',
	            buffer: this.vertexBuffer,
	            size: 2,
	            stride: stride
	        }, { //texcoord UV
	            name: 'texcoord0',
	            buffer: this.vertexBuffer,
	            size: 2,
	            offset: 2 * 4,
	            stride: stride
	        }, { //color (packed) C
	            name: 'color',
	            buffer: this.vertexBuffer,
	            size: 4,
	            stride: stride,
	            offset: 4 * 4,
	            type: gl.UNSIGNED_BYTE,
	            normalized: true
	        }], this.indexBuffer)
	        return this
	    },

	    ensureCapacity: function(capacity) {
	        if (this.capacity < capacity)
	            this.create({ capacity: capacity })
	        return this
	    }
	}

/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	var createVAOEmulated = __webpack_require__(37)

	function createVAO(gl, attributes, elements, elementsType) {
	  var vao = createVAOEmulated(gl)
	  vao.update(attributes, elements, elementsType)
	  return vao
	}

	module.exports = createVAO

/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	var bindAttribs = __webpack_require__(38)

	function VAOEmulated(gl) {
	  this.gl = gl
	  this._elements = null
	  this._attributes = null
	  this._elementsType = gl.UNSIGNED_SHORT
	}

	VAOEmulated.prototype.bind = function(shader) {
	  if (!shader)
	    throw new Error('must associate shader with vertex array')
	  bindAttribs(this.gl, this._elements, this._attributes, shader)
	}

	VAOEmulated.prototype.update = function(attributes, elements, elementsType) {
	  this._elements = elements
	  this._attributes = attributes
	  this._elementsType = elementsType || this.gl.UNSIGNED_SHORT
	}

	VAOEmulated.prototype.dispose = function() { }
	VAOEmulated.prototype.unbind = function() {
	  bindAttribs(this.gl)
	}

	VAOEmulated.prototype.draw = function(mode, count, offset) {
	  offset = offset || 0
	  var gl = this.gl
	  if(this._elements) {
	    gl.drawElements(mode, count, this._elementsType, offset)
	  } else {
	    gl.drawArrays(mode, offset, count)
	  }
	}

	function createVAOEmulated(gl) {
	  return new VAOEmulated(gl)
	}

	module.exports = createVAOEmulated

/***/ },
/* 38 */
/***/ function(module, exports) {

	function getAttributeLocation(name, shader) {
	    if (!name)
	        return null
	    var attr = shader.attributes
	    if (attr[name]) 
	        return attr[name].location
	    return null
	}

	var nattribs = null
	var bound = null

	function doBind(gl, elements, attributes, shader) {
	    if (elements) {
	        elements.bind()
	    } else {
	        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
	    }
	    if (nattribs === null) {
	      nattribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) | 0
	      bound = new Array(nattribs)
	    }

	    if (attributes) {
	        if (attributes.length > nattribs) {
	            throw new Error("gl-vao: Too many vertex attributes")
	        }

	        var lastBound = null

	        for (i=0; i<nattribs; i++)
	          bound[i] = false

	        //now bind aliased attributes
	        for (i=0; i<attributes.length; i++) {
	            var attrib = attributes[i]
	            var loc = getAttributeLocation(attrib.name, shader)
	            if (loc === null)
	                continue

	            bound[loc] = true

	            if(attrib.buffer) {
	              var buffer = attrib.buffer
	              var size = attrib.size || 4
	              var type = attrib.type || gl.FLOAT
	              var normalized = !!attrib.normalized
	              var stride = attrib.stride || 0
	              var offset = attrib.offset || 0
	              if (lastBound !== buffer) {
	                buffer.bind()
	                lastBound = buffer
	              }
	              gl.enableVertexAttribArray(loc)
	              gl.vertexAttribPointer(loc, size, type, normalized, stride, offset)
	            } else {
	              if(typeof attrib === "number") {
	                gl.vertexAttrib1f(loc, attrib)
	              } else if(attrib.length === 1) {
	                gl.vertexAttrib1f(loc, attrib[0])
	              } else if(attrib.length === 2) {
	                gl.vertexAttrib2f(loc, attrib[0], attrib[1])
	              } else if(attrib.length === 3) {
	                gl.vertexAttrib3f(loc, attrib[0], attrib[1], attrib[2])
	              } else if(attrib.length === 4) {
	                gl.vertexAttrib4f(loc, attrib[0], attrib[1], attrib[2], attrib[3])
	              } else {
	                throw new Error("gl-vao: Invalid vertex attribute")
	              }
	              gl.disableVertexAttribArray(loc)
	            }

	        }
	        
	        for (i=0; i<nattribs; i++) {
	          if (!bound[i])
	            gl.disableVertexAttribArray(i)
	        }
	    } else {
	      gl.bindBuffer(gl.ARRAY_BUFFER, null)
	      for(var i=0; i<nattribs; ++i) {
	        gl.disableVertexAttribArray(i)
	      }
	    }
	}

	module.exports = doBind

/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	"use strict"

	var pool = __webpack_require__(40)
	var ops = __webpack_require__(43)
	var ndarray = __webpack_require__(48)

	var SUPPORTED_TYPES = [
	  "uint8",
	  "uint8_clamped",
	  "uint16",
	  "uint32",
	  "int8",
	  "int16",
	  "int32",
	  "float32" ]

	function GLBuffer(gl, type, handle, length, usage) {
	  this.gl = gl
	  this.type = type
	  this.handle = handle
	  this.length = length
	  this.usage = usage
	}

	var proto = GLBuffer.prototype

	proto.bind = function() {
	  this.gl.bindBuffer(this.type, this.handle)
	}

	proto.unbind = function() {
	  this.gl.bindBuffer(this.type, null)
	}

	proto.dispose = function() {
	  this.gl.deleteBuffer(this.handle)
	}

	function updateTypeArray(gl, type, len, usage, data, offset) {
	  var dataLen = data.length * data.BYTES_PER_ELEMENT
	  if(offset < 0) {
	    gl.bufferData(type, data, usage)
	    return dataLen
	  }
	  if(dataLen + offset > len) {
	    throw new Error("gl-buffer: If resizing buffer, must not specify offset")
	  }
	  gl.bufferSubData(type, offset, data)
	  return len
	}

	function makeScratchTypeArray(array, dtype) {
	  var res = pool.malloc(array.length, dtype)
	  var n = array.length
	  for(var i=0; i<n; ++i) {
	    res[i] = array[i]
	  }
	  return res
	}

	function isPacked(shape, stride) {
	  var n = 1
	  for(var i=stride.length-1; i>=0; --i) {
	    if(stride[i] !== n) {
	      return false
	    }
	    n *= shape[i]
	  }
	  return true
	}

	proto.update = function(array, offset) {
	  if(typeof offset !== "number") {
	    offset = -1
	  }
	  this.bind()
	  if(typeof array === "object" && typeof array.shape !== "undefined") { //ndarray
	    var dtype = array.dtype
	    if(SUPPORTED_TYPES.indexOf(dtype) < 0) {
	      dtype = "float32"
	    }
	    if(this.type === this.gl.ELEMENT_ARRAY_BUFFER) {
	      var ext = gl.getExtension('OES_element_index_uint')
	      if(ext && dtype !== "uint16") {
	        dtype = "uint32"
	      } else {
	        dtype = "uint16"
	      }
	    }
	    if(dtype === array.dtype && isPacked(array.shape, array.stride)) {
	      if(array.offset === 0 && array.data.length === array.shape[0]) {
	        this.length = updateTypeArray(this.gl, this.type, this.length, this.usage, array.data, offset)
	      } else {
	        this.length = updateTypeArray(this.gl, this.type, this.length, this.usage, array.data.subarray(array.offset, array.shape[0]), offset)
	      }
	    } else {
	      var tmp = pool.malloc(array.size, dtype)
	      var ndt = ndarray(tmp, array.shape)
	      ops.assign(ndt, array)
	      if(offset < 0) {
	        this.length = updateTypeArray(this.gl, this.type, this.length, this.usage, tmp, offset)
	      } else {
	        this.length = updateTypeArray(this.gl, this.type, this.length, this.usage, tmp.subarray(0, array.size), offset)
	      }
	      pool.free(tmp)
	    }
	  } else if(Array.isArray(array)) { //Vanilla array
	    var t
	    if(this.type === this.gl.ELEMENT_ARRAY_BUFFER) {
	      t = makeScratchTypeArray(array, "uint16")
	    } else {
	      t = makeScratchTypeArray(array, "float32")
	    }
	    if(offset < 0) {
	      this.length = updateTypeArray(this.gl, this.type, this.length, this.usage, t, offset)
	    } else {
	      this.length = updateTypeArray(this.gl, this.type, this.length, this.usage, t.subarray(0, array.length), offset)
	    }
	    pool.free(t)
	  } else if(typeof array === "object" && typeof array.length === "number") { //Typed array
	    this.length = updateTypeArray(this.gl, this.type, this.length, this.usage, array, offset)
	  } else if(typeof array === "number" || array === undefined) { //Number/default
	    if(offset >= 0) {
	      throw new Error("gl-buffer: Cannot specify offset when resizing buffer")
	    }
	    array = array | 0
	    if(array <= 0) {
	      array = 1
	    }
	    this.gl.bufferData(this.type, array|0, this.usage)
	    this.length = array
	  } else { //Error, case should not happen
	    throw new Error("gl-buffer: Invalid data type")
	  }
	}

	function createBuffer(gl, data, type, usage) {
	  type = type || gl.ARRAY_BUFFER
	  usage = usage || gl.DYNAMIC_DRAW
	  if(type !== gl.ARRAY_BUFFER && type !== gl.ELEMENT_ARRAY_BUFFER) {
	    throw new Error("gl-buffer: Invalid type for webgl buffer, must be either gl.ARRAY_BUFFER or gl.ELEMENT_ARRAY_BUFFER")
	  }
	  if(usage !== gl.DYNAMIC_DRAW && usage !== gl.STATIC_DRAW && usage !== gl.STREAM_DRAW) {
	    throw new Error("gl-buffer: Invalid usage for buffer, must be either gl.DYNAMIC_DRAW, gl.STATIC_DRAW or gl.STREAM_DRAW")
	  }
	  var handle = gl.createBuffer()
	  var result = new GLBuffer(gl, type, handle, 0, usage)
	  result.update(data)
	  return result
	}

	module.exports = createBuffer


/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, Buffer) {'use strict'

	var bits = __webpack_require__(41)
	var dup = __webpack_require__(42)

	//Legacy pool support
	if(!global.__TYPEDARRAY_POOL) {
	  global.__TYPEDARRAY_POOL = {
	      UINT8   : dup([32, 0])
	    , UINT16  : dup([32, 0])
	    , UINT32  : dup([32, 0])
	    , INT8    : dup([32, 0])
	    , INT16   : dup([32, 0])
	    , INT32   : dup([32, 0])
	    , FLOAT   : dup([32, 0])
	    , DOUBLE  : dup([32, 0])
	    , DATA    : dup([32, 0])
	    , UINT8C  : dup([32, 0])
	    , BUFFER  : dup([32, 0])
	  }
	}

	var hasUint8C = (typeof Uint8ClampedArray) !== 'undefined'
	var POOL = global.__TYPEDARRAY_POOL

	//Upgrade pool
	if(!POOL.UINT8C) {
	  POOL.UINT8C = dup([32, 0])
	}
	if(!POOL.BUFFER) {
	  POOL.BUFFER = dup([32, 0])
	}

	//New technique: Only allocate from ArrayBufferView and Buffer
	var DATA    = POOL.DATA
	  , BUFFER  = POOL.BUFFER

	exports.free = function free(array) {
	  if(Buffer.isBuffer(array)) {
	    BUFFER[bits.log2(array.length)].push(array)
	  } else {
	    if(Object.prototype.toString.call(array) !== '[object ArrayBuffer]') {
	      array = array.buffer
	    }
	    if(!array) {
	      return
	    }
	    var n = array.length || array.byteLength
	    var log_n = bits.log2(n)|0
	    DATA[log_n].push(array)
	  }
	}

	function freeArrayBuffer(buffer) {
	  if(!buffer) {
	    return
	  }
	  var n = buffer.length || buffer.byteLength
	  var log_n = bits.log2(n)
	  DATA[log_n].push(buffer)
	}

	function freeTypedArray(array) {
	  freeArrayBuffer(array.buffer)
	}

	exports.freeUint8 =
	exports.freeUint16 =
	exports.freeUint32 =
	exports.freeInt8 =
	exports.freeInt16 =
	exports.freeInt32 =
	exports.freeFloat32 = 
	exports.freeFloat =
	exports.freeFloat64 = 
	exports.freeDouble = 
	exports.freeUint8Clamped = 
	exports.freeDataView = freeTypedArray

	exports.freeArrayBuffer = freeArrayBuffer

	exports.freeBuffer = function freeBuffer(array) {
	  BUFFER[bits.log2(array.length)].push(array)
	}

	exports.malloc = function malloc(n, dtype) {
	  if(dtype === undefined || dtype === 'arraybuffer') {
	    return mallocArrayBuffer(n)
	  } else {
	    switch(dtype) {
	      case 'uint8':
	        return mallocUint8(n)
	      case 'uint16':
	        return mallocUint16(n)
	      case 'uint32':
	        return mallocUint32(n)
	      case 'int8':
	        return mallocInt8(n)
	      case 'int16':
	        return mallocInt16(n)
	      case 'int32':
	        return mallocInt32(n)
	      case 'float':
	      case 'float32':
	        return mallocFloat(n)
	      case 'double':
	      case 'float64':
	        return mallocDouble(n)
	      case 'uint8_clamped':
	        return mallocUint8Clamped(n)
	      case 'buffer':
	        return mallocBuffer(n)
	      case 'data':
	      case 'dataview':
	        return mallocDataView(n)

	      default:
	        return null
	    }
	  }
	  return null
	}

	function mallocArrayBuffer(n) {
	  var n = bits.nextPow2(n)
	  var log_n = bits.log2(n)
	  var d = DATA[log_n]
	  if(d.length > 0) {
	    return d.pop()
	  }
	  return new ArrayBuffer(n)
	}
	exports.mallocArrayBuffer = mallocArrayBuffer

	function mallocUint8(n) {
	  return new Uint8Array(mallocArrayBuffer(n), 0, n)
	}
	exports.mallocUint8 = mallocUint8

	function mallocUint16(n) {
	  return new Uint16Array(mallocArrayBuffer(2*n), 0, n)
	}
	exports.mallocUint16 = mallocUint16

	function mallocUint32(n) {
	  return new Uint32Array(mallocArrayBuffer(4*n), 0, n)
	}
	exports.mallocUint32 = mallocUint32

	function mallocInt8(n) {
	  return new Int8Array(mallocArrayBuffer(n), 0, n)
	}
	exports.mallocInt8 = mallocInt8

	function mallocInt16(n) {
	  return new Int16Array(mallocArrayBuffer(2*n), 0, n)
	}
	exports.mallocInt16 = mallocInt16

	function mallocInt32(n) {
	  return new Int32Array(mallocArrayBuffer(4*n), 0, n)
	}
	exports.mallocInt32 = mallocInt32

	function mallocFloat(n) {
	  return new Float32Array(mallocArrayBuffer(4*n), 0, n)
	}
	exports.mallocFloat32 = exports.mallocFloat = mallocFloat

	function mallocDouble(n) {
	  return new Float64Array(mallocArrayBuffer(8*n), 0, n)
	}
	exports.mallocFloat64 = exports.mallocDouble = mallocDouble

	function mallocUint8Clamped(n) {
	  if(hasUint8C) {
	    return new Uint8ClampedArray(mallocArrayBuffer(n), 0, n)
	  } else {
	    return mallocUint8(n)
	  }
	}
	exports.mallocUint8Clamped = mallocUint8Clamped

	function mallocDataView(n) {
	  return new DataView(mallocArrayBuffer(n), 0, n)
	}
	exports.mallocDataView = mallocDataView

	function mallocBuffer(n) {
	  n = bits.nextPow2(n)
	  var log_n = bits.log2(n)
	  var cache = BUFFER[log_n]
	  if(cache.length > 0) {
	    return cache.pop()
	  }
	  return new Buffer(n)
	}
	exports.mallocBuffer = mallocBuffer

	exports.clearCache = function clearCache() {
	  for(var i=0; i<32; ++i) {
	    POOL.UINT8[i].length = 0
	    POOL.UINT16[i].length = 0
	    POOL.UINT32[i].length = 0
	    POOL.INT8[i].length = 0
	    POOL.INT16[i].length = 0
	    POOL.INT32[i].length = 0
	    POOL.FLOAT[i].length = 0
	    POOL.DOUBLE[i].length = 0
	    POOL.UINT8C[i].length = 0
	    DATA[i].length = 0
	    BUFFER[i].length = 0
	  }
	}
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(23).Buffer))

/***/ },
/* 41 */
/***/ function(module, exports) {

	/**
	 * Bit twiddling hacks for JavaScript.
	 *
	 * Author: Mikola Lysenko
	 *
	 * Ported from Stanford bit twiddling hack library:
	 *    http://graphics.stanford.edu/~seander/bithacks.html
	 */

	"use strict"; "use restrict";

	//Number of bits in an integer
	var INT_BITS = 32;

	//Constants
	exports.INT_BITS  = INT_BITS;
	exports.INT_MAX   =  0x7fffffff;
	exports.INT_MIN   = -1<<(INT_BITS-1);

	//Returns -1, 0, +1 depending on sign of x
	exports.sign = function(v) {
	  return (v > 0) - (v < 0);
	}

	//Computes absolute value of integer
	exports.abs = function(v) {
	  var mask = v >> (INT_BITS-1);
	  return (v ^ mask) - mask;
	}

	//Computes minimum of integers x and y
	exports.min = function(x, y) {
	  return y ^ ((x ^ y) & -(x < y));
	}

	//Computes maximum of integers x and y
	exports.max = function(x, y) {
	  return x ^ ((x ^ y) & -(x < y));
	}

	//Checks if a number is a power of two
	exports.isPow2 = function(v) {
	  return !(v & (v-1)) && (!!v);
	}

	//Computes log base 2 of v
	exports.log2 = function(v) {
	  var r, shift;
	  r =     (v > 0xFFFF) << 4; v >>>= r;
	  shift = (v > 0xFF  ) << 3; v >>>= shift; r |= shift;
	  shift = (v > 0xF   ) << 2; v >>>= shift; r |= shift;
	  shift = (v > 0x3   ) << 1; v >>>= shift; r |= shift;
	  return r | (v >> 1);
	}

	//Computes log base 10 of v
	exports.log10 = function(v) {
	  return  (v >= 1000000000) ? 9 : (v >= 100000000) ? 8 : (v >= 10000000) ? 7 :
	          (v >= 1000000) ? 6 : (v >= 100000) ? 5 : (v >= 10000) ? 4 :
	          (v >= 1000) ? 3 : (v >= 100) ? 2 : (v >= 10) ? 1 : 0;
	}

	//Counts number of bits
	exports.popCount = function(v) {
	  v = v - ((v >>> 1) & 0x55555555);
	  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
	  return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
	}

	//Counts number of trailing zeros
	function countTrailingZeros(v) {
	  var c = 32;
	  v &= -v;
	  if (v) c--;
	  if (v & 0x0000FFFF) c -= 16;
	  if (v & 0x00FF00FF) c -= 8;
	  if (v & 0x0F0F0F0F) c -= 4;
	  if (v & 0x33333333) c -= 2;
	  if (v & 0x55555555) c -= 1;
	  return c;
	}
	exports.countTrailingZeros = countTrailingZeros;

	//Rounds to next power of 2
	exports.nextPow2 = function(v) {
	  v += v === 0;
	  --v;
	  v |= v >>> 1;
	  v |= v >>> 2;
	  v |= v >>> 4;
	  v |= v >>> 8;
	  v |= v >>> 16;
	  return v + 1;
	}

	//Rounds down to previous power of 2
	exports.prevPow2 = function(v) {
	  v |= v >>> 1;
	  v |= v >>> 2;
	  v |= v >>> 4;
	  v |= v >>> 8;
	  v |= v >>> 16;
	  return v - (v>>>1);
	}

	//Computes parity of word
	exports.parity = function(v) {
	  v ^= v >>> 16;
	  v ^= v >>> 8;
	  v ^= v >>> 4;
	  v &= 0xf;
	  return (0x6996 >>> v) & 1;
	}

	var REVERSE_TABLE = new Array(256);

	(function(tab) {
	  for(var i=0; i<256; ++i) {
	    var v = i, r = i, s = 7;
	    for (v >>>= 1; v; v >>>= 1) {
	      r <<= 1;
	      r |= v & 1;
	      --s;
	    }
	    tab[i] = (r << s) & 0xff;
	  }
	})(REVERSE_TABLE);

	//Reverse bits in a 32 bit word
	exports.reverse = function(v) {
	  return  (REVERSE_TABLE[ v         & 0xff] << 24) |
	          (REVERSE_TABLE[(v >>> 8)  & 0xff] << 16) |
	          (REVERSE_TABLE[(v >>> 16) & 0xff] << 8)  |
	           REVERSE_TABLE[(v >>> 24) & 0xff];
	}

	//Interleave bits of 2 coordinates with 16 bits.  Useful for fast quadtree codes
	exports.interleave2 = function(x, y) {
	  x &= 0xFFFF;
	  x = (x | (x << 8)) & 0x00FF00FF;
	  x = (x | (x << 4)) & 0x0F0F0F0F;
	  x = (x | (x << 2)) & 0x33333333;
	  x = (x | (x << 1)) & 0x55555555;

	  y &= 0xFFFF;
	  y = (y | (y << 8)) & 0x00FF00FF;
	  y = (y | (y << 4)) & 0x0F0F0F0F;
	  y = (y | (y << 2)) & 0x33333333;
	  y = (y | (y << 1)) & 0x55555555;

	  return x | (y << 1);
	}

	//Extracts the nth interleaved component
	exports.deinterleave2 = function(v, n) {
	  v = (v >>> n) & 0x55555555;
	  v = (v | (v >>> 1))  & 0x33333333;
	  v = (v | (v >>> 2))  & 0x0F0F0F0F;
	  v = (v | (v >>> 4))  & 0x00FF00FF;
	  v = (v | (v >>> 16)) & 0x000FFFF;
	  return (v << 16) >> 16;
	}


	//Interleave bits of 3 coordinates, each with 10 bits.  Useful for fast octree codes
	exports.interleave3 = function(x, y, z) {
	  x &= 0x3FF;
	  x  = (x | (x<<16)) & 4278190335;
	  x  = (x | (x<<8))  & 251719695;
	  x  = (x | (x<<4))  & 3272356035;
	  x  = (x | (x<<2))  & 1227133513;

	  y &= 0x3FF;
	  y  = (y | (y<<16)) & 4278190335;
	  y  = (y | (y<<8))  & 251719695;
	  y  = (y | (y<<4))  & 3272356035;
	  y  = (y | (y<<2))  & 1227133513;
	  x |= (y << 1);
	  
	  z &= 0x3FF;
	  z  = (z | (z<<16)) & 4278190335;
	  z  = (z | (z<<8))  & 251719695;
	  z  = (z | (z<<4))  & 3272356035;
	  z  = (z | (z<<2))  & 1227133513;
	  
	  return x | (z << 2);
	}

	//Extracts nth interleaved component of a 3-tuple
	exports.deinterleave3 = function(v, n) {
	  v = (v >>> n)       & 1227133513;
	  v = (v | (v>>>2))   & 3272356035;
	  v = (v | (v>>>4))   & 251719695;
	  v = (v | (v>>>8))   & 4278190335;
	  v = (v | (v>>>16))  & 0x3FF;
	  return (v<<22)>>22;
	}

	//Computes next combination in colexicographic order (this is mistakenly called nextPermutation on the bit twiddling hacks page)
	exports.nextCombination = function(v) {
	  var t = v | (v - 1);
	  return (t + 1) | (((~t & -~t) - 1) >>> (countTrailingZeros(v) + 1));
	}



/***/ },
/* 42 */
/***/ function(module, exports) {

	"use strict"

	function dupe_array(count, value, i) {
	  var c = count[i]|0
	  if(c <= 0) {
	    return []
	  }
	  var result = new Array(c), j
	  if(i === count.length-1) {
	    for(j=0; j<c; ++j) {
	      result[j] = value
	    }
	  } else {
	    for(j=0; j<c; ++j) {
	      result[j] = dupe_array(count, value, i+1)
	    }
	  }
	  return result
	}

	function dupe_number(count, value) {
	  var result, i
	  result = new Array(count)
	  for(i=0; i<count; ++i) {
	    result[i] = value
	  }
	  return result
	}

	function dupe(count, value) {
	  if(typeof value === "undefined") {
	    value = 0
	  }
	  switch(typeof count) {
	    case "number":
	      if(count > 0) {
	        return dupe_number(count|0, value)
	      }
	    break
	    case "object":
	      if(typeof (count.length) === "number") {
	        return dupe_array(count, value, 0)
	      }
	    break
	  }
	  return []
	}

	module.exports = dupe

/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	"use strict"

	var compile = __webpack_require__(44)

	var EmptyProc = {
	  body: "",
	  args: [],
	  thisVars: [],
	  localVars: []
	}

	function fixup(x) {
	  if(!x) {
	    return EmptyProc
	  }
	  for(var i=0; i<x.args.length; ++i) {
	    var a = x.args[i]
	    if(i === 0) {
	      x.args[i] = {name: a, lvalue:true, rvalue: !!x.rvalue, count:x.count||1 }
	    } else {
	      x.args[i] = {name: a, lvalue:false, rvalue:true, count: 1}
	    }
	  }
	  if(!x.thisVars) {
	    x.thisVars = []
	  }
	  if(!x.localVars) {
	    x.localVars = []
	  }
	  return x
	}

	function pcompile(user_args) {
	  return compile({
	    args:     user_args.args,
	    pre:      fixup(user_args.pre),
	    body:     fixup(user_args.body),
	    post:     fixup(user_args.proc),
	    funcName: user_args.funcName
	  })
	}

	function makeOp(user_args) {
	  var args = []
	  for(var i=0; i<user_args.args.length; ++i) {
	    args.push("a"+i)
	  }
	  var wrapper = new Function("P", [
	    "return function ", user_args.funcName, "_ndarrayops(", args.join(","), ") {P(", args.join(","), ");return a0}"
	  ].join(""))
	  return wrapper(pcompile(user_args))
	}

	var assign_ops = {
	  add:  "+",
	  sub:  "-",
	  mul:  "*",
	  div:  "/",
	  mod:  "%",
	  band: "&",
	  bor:  "|",
	  bxor: "^",
	  lshift: "<<",
	  rshift: ">>",
	  rrshift: ">>>"
	}
	;(function(){
	  for(var id in assign_ops) {
	    var op = assign_ops[id]
	    exports[id] = makeOp({
	      args: ["array","array","array"],
	      body: {args:["a","b","c"],
	             body: "a=b"+op+"c"},
	      funcName: id
	    })
	    exports[id+"eq"] = makeOp({
	      args: ["array","array"],
	      body: {args:["a","b"],
	             body:"a"+op+"=b"},
	      rvalue: true,
	      funcName: id+"eq"
	    })
	    exports[id+"s"] = makeOp({
	      args: ["array", "array", "scalar"],
	      body: {args:["a","b","s"],
	             body:"a=b"+op+"s"},
	      funcName: id+"s"
	    })
	    exports[id+"seq"] = makeOp({
	      args: ["array","scalar"],
	      body: {args:["a","s"],
	             body:"a"+op+"=s"},
	      rvalue: true,
	      funcName: id+"seq"
	    })
	  }
	})();

	var unary_ops = {
	  not: "!",
	  bnot: "~",
	  neg: "-",
	  recip: "1.0/"
	}
	;(function(){
	  for(var id in unary_ops) {
	    var op = unary_ops[id]
	    exports[id] = makeOp({
	      args: ["array", "array"],
	      body: {args:["a","b"],
	             body:"a="+op+"b"},
	      funcName: id
	    })
	    exports[id+"eq"] = makeOp({
	      args: ["array"],
	      body: {args:["a"],
	             body:"a="+op+"a"},
	      rvalue: true,
	      count: 2,
	      funcName: id+"eq"
	    })
	  }
	})();

	var binary_ops = {
	  and: "&&",
	  or: "||",
	  eq: "===",
	  neq: "!==",
	  lt: "<",
	  gt: ">",
	  leq: "<=",
	  geq: ">="
	}
	;(function() {
	  for(var id in binary_ops) {
	    var op = binary_ops[id]
	    exports[id] = makeOp({
	      args: ["array","array","array"],
	      body: {args:["a", "b", "c"],
	             body:"a=b"+op+"c"},
	      funcName: id
	    })
	    exports[id+"s"] = makeOp({
	      args: ["array","array","scalar"],
	      body: {args:["a", "b", "s"],
	             body:"a=b"+op+"s"},
	      funcName: id+"s"
	    })
	    exports[id+"eq"] = makeOp({
	      args: ["array", "array"],
	      body: {args:["a", "b"],
	             body:"a=a"+op+"b"},
	      rvalue:true,
	      count:2,
	      funcName: id+"eq"
	    })
	    exports[id+"seq"] = makeOp({
	      args: ["array", "scalar"],
	      body: {args:["a","s"],
	             body:"a=a"+op+"s"},
	      rvalue:true,
	      count:2,
	      funcName: id+"seq"
	    })
	  }
	})();

	var math_unary = [
	  "abs",
	  "acos",
	  "asin",
	  "atan",
	  "ceil",
	  "cos",
	  "exp",
	  "floor",
	  "log",
	  "round",
	  "sin",
	  "sqrt",
	  "tan"
	]
	;(function() {
	  for(var i=0; i<math_unary.length; ++i) {
	    var f = math_unary[i]
	    exports[f] = makeOp({
	                    args: ["array", "array"],
	                    pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                    body: {args:["a","b"], body:"a=this_f(b)", thisVars:["this_f"]},
	                    funcName: f
	                  })
	    exports[f+"eq"] = makeOp({
	                      args: ["array"],
	                      pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                      body: {args: ["a"], body:"a=this_f(a)", thisVars:["this_f"]},
	                      rvalue: true,
	                      count: 2,
	                      funcName: f+"eq"
	                    })
	  }
	})();

	var math_comm = [
	  "max",
	  "min",
	  "atan2",
	  "pow"
	]
	;(function(){
	  for(var i=0; i<math_comm.length; ++i) {
	    var f= math_comm[i]
	    exports[f] = makeOp({
	                  args:["array", "array", "array"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b","c"], body:"a=this_f(b,c)", thisVars:["this_f"]},
	                  funcName: f
	                })
	    exports[f+"s"] = makeOp({
	                  args:["array", "array", "scalar"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b","c"], body:"a=this_f(b,c)", thisVars:["this_f"]},
	                  funcName: f+"s"
	                  })
	    exports[f+"eq"] = makeOp({ args:["array", "array"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b"], body:"a=this_f(a,b)", thisVars:["this_f"]},
	                  rvalue: true,
	                  count: 2,
	                  funcName: f+"eq"
	                  })
	    exports[f+"seq"] = makeOp({ args:["array", "scalar"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b"], body:"a=this_f(a,b)", thisVars:["this_f"]},
	                  rvalue:true,
	                  count:2,
	                  funcName: f+"seq"
	                  })
	  }
	})();

	var math_noncomm = [
	  "atan2",
	  "pow"
	]
	;(function(){
	  for(var i=0; i<math_noncomm.length; ++i) {
	    var f= math_noncomm[i]
	    exports[f+"op"] = makeOp({
	                  args:["array", "array", "array"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b","c"], body:"a=this_f(c,b)", thisVars:["this_f"]},
	                  funcName: f+"op"
	                })
	    exports[f+"ops"] = makeOp({
	                  args:["array", "array", "scalar"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b","c"], body:"a=this_f(c,b)", thisVars:["this_f"]},
	                  funcName: f+"ops"
	                  })
	    exports[f+"opeq"] = makeOp({ args:["array", "array"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b"], body:"a=this_f(b,a)", thisVars:["this_f"]},
	                  rvalue: true,
	                  count: 2,
	                  funcName: f+"opeq"
	                  })
	    exports[f+"opseq"] = makeOp({ args:["array", "scalar"],
	                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
	                  body: {args:["a","b"], body:"a=this_f(b,a)", thisVars:["this_f"]},
	                  rvalue:true,
	                  count:2,
	                  funcName: f+"opseq"
	                  })
	  }
	})();

	exports.any = compile({
	  args:["array"],
	  pre: EmptyProc,
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "if(a){return true}", localVars: [], thisVars: []},
	  post: {args:[], localVars:[], thisVars:[], body:"return false"},
	  funcName: "any"
	})

	exports.all = compile({
	  args:["array"],
	  pre: EmptyProc,
	  body: {args:[{name:"x", lvalue:false, rvalue:true, count:1}], body: "if(!x){return false}", localVars: [], thisVars: []},
	  post: {args:[], localVars:[], thisVars:[], body:"return true"},
	  funcName: "all"
	})

	exports.sum = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "this_s+=a", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
	  funcName: "sum"
	})

	exports.prod = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=1"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "this_s*=a", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
	  funcName: "prod"
	})

	exports.norm2squared = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:2}], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
	  funcName: "norm2squared"
	})
	  
	exports.norm2 = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:2}], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return Math.sqrt(this_s)"},
	  funcName: "norm2"
	})
	  

	exports.norminf = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:4}], body:"if(-a>this_s){this_s=-a}else if(a>this_s){this_s=a}", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
	  funcName: "norminf"
	})

	exports.norm1 = compile({
	  args:["array"],
	  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
	  body: {args:[{name:"a", lvalue:false, rvalue:true, count:3}], body: "this_s+=a<0?-a:a", localVars: [], thisVars: ["this_s"]},
	  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
	  funcName: "norm1"
	})

	exports.sup = compile({
	  args: [ "array" ],
	  pre:
	   { body: "this_h=-Infinity",
	     args: [],
	     thisVars: [ "this_h" ],
	     localVars: [] },
	  body:
	   { body: "if(_inline_1_arg0_>this_h)this_h=_inline_1_arg0_",
	     args: [{"name":"_inline_1_arg0_","lvalue":false,"rvalue":true,"count":2} ],
	     thisVars: [ "this_h" ],
	     localVars: [] },
	  post:
	   { body: "return this_h",
	     args: [],
	     thisVars: [ "this_h" ],
	     localVars: [] }
	 })

	exports.inf = compile({
	  args: [ "array" ],
	  pre:
	   { body: "this_h=Infinity",
	     args: [],
	     thisVars: [ "this_h" ],
	     localVars: [] },
	  body:
	   { body: "if(_inline_1_arg0_<this_h)this_h=_inline_1_arg0_",
	     args: [{"name":"_inline_1_arg0_","lvalue":false,"rvalue":true,"count":2} ],
	     thisVars: [ "this_h" ],
	     localVars: [] },
	  post:
	   { body: "return this_h",
	     args: [],
	     thisVars: [ "this_h" ],
	     localVars: [] }
	 })

	exports.argmin = compile({
	  args:["index","array","shape"],
	  pre:{
	    body:"{this_v=Infinity;this_i=_inline_0_arg2_.slice(0)}",
	    args:[
	      {name:"_inline_0_arg0_",lvalue:false,rvalue:false,count:0},
	      {name:"_inline_0_arg1_",lvalue:false,rvalue:false,count:0},
	      {name:"_inline_0_arg2_",lvalue:false,rvalue:true,count:1}
	      ],
	    thisVars:["this_i","this_v"],
	    localVars:[]},
	  body:{
	    body:"{if(_inline_1_arg1_<this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
	    args:[
	      {name:"_inline_1_arg0_",lvalue:false,rvalue:true,count:2},
	      {name:"_inline_1_arg1_",lvalue:false,rvalue:true,count:2}],
	    thisVars:["this_i","this_v"],
	    localVars:["_inline_1_k"]},
	  post:{
	    body:"{return this_i}",
	    args:[],
	    thisVars:["this_i"],
	    localVars:[]}
	})

	exports.argmax = compile({
	  args:["index","array","shape"],
	  pre:{
	    body:"{this_v=-Infinity;this_i=_inline_0_arg2_.slice(0)}",
	    args:[
	      {name:"_inline_0_arg0_",lvalue:false,rvalue:false,count:0},
	      {name:"_inline_0_arg1_",lvalue:false,rvalue:false,count:0},
	      {name:"_inline_0_arg2_",lvalue:false,rvalue:true,count:1}
	      ],
	    thisVars:["this_i","this_v"],
	    localVars:[]},
	  body:{
	    body:"{if(_inline_1_arg1_>this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
	    args:[
	      {name:"_inline_1_arg0_",lvalue:false,rvalue:true,count:2},
	      {name:"_inline_1_arg1_",lvalue:false,rvalue:true,count:2}],
	    thisVars:["this_i","this_v"],
	    localVars:["_inline_1_k"]},
	  post:{
	    body:"{return this_i}",
	    args:[],
	    thisVars:["this_i"],
	    localVars:[]}
	})  

	exports.random = makeOp({
	  args: ["array"],
	  pre: {args:[], body:"this_f=Math.random", thisVars:["this_f"]},
	  body: {args: ["a"], body:"a=this_f()", thisVars:["this_f"]},
	  funcName: "random"
	})

	exports.assign = makeOp({
	  args:["array", "array"],
	  body: {args:["a", "b"], body:"a=b"},
	  funcName: "assign" })

	exports.assigns = makeOp({
	  args:["array", "scalar"],
	  body: {args:["a", "b"], body:"a=b"},
	  funcName: "assigns" })


	exports.equals = compile({
	  args:["array", "array"],
	  pre: EmptyProc,
	  body: {args:[{name:"x", lvalue:false, rvalue:true, count:1},
	               {name:"y", lvalue:false, rvalue:true, count:1}], 
	        body: "if(x!==y){return false}", 
	        localVars: [], 
	        thisVars: []},
	  post: {args:[], localVars:[], thisVars:[], body:"return true"},
	  funcName: "equals"
	})




/***/ },
/* 44 */
/***/ function(module, exports, __webpack_require__) {

	"use strict"

	var createThunk = __webpack_require__(45)

	function Procedure() {
	  this.argTypes = []
	  this.shimArgs = []
	  this.arrayArgs = []
	  this.arrayBlockIndices = []
	  this.scalarArgs = []
	  this.offsetArgs = []
	  this.offsetArgIndex = []
	  this.indexArgs = []
	  this.shapeArgs = []
	  this.funcName = ""
	  this.pre = null
	  this.body = null
	  this.post = null
	  this.debug = false
	}

	function compileCwise(user_args) {
	  //Create procedure
	  var proc = new Procedure()
	  
	  //Parse blocks
	  proc.pre    = user_args.pre
	  proc.body   = user_args.body
	  proc.post   = user_args.post

	  //Parse arguments
	  var proc_args = user_args.args.slice(0)
	  proc.argTypes = proc_args
	  for(var i=0; i<proc_args.length; ++i) {
	    var arg_type = proc_args[i]
	    if(arg_type === "array" || (typeof arg_type === "object" && arg_type.blockIndices)) {
	      proc.argTypes[i] = "array"
	      proc.arrayArgs.push(i)
	      proc.arrayBlockIndices.push(arg_type.blockIndices ? arg_type.blockIndices : 0)
	      proc.shimArgs.push("array" + i)
	      if(i < proc.pre.args.length && proc.pre.args[i].count>0) {
	        throw new Error("cwise: pre() block may not reference array args")
	      }
	      if(i < proc.post.args.length && proc.post.args[i].count>0) {
	        throw new Error("cwise: post() block may not reference array args")
	      }
	    } else if(arg_type === "scalar") {
	      proc.scalarArgs.push(i)
	      proc.shimArgs.push("scalar" + i)
	    } else if(arg_type === "index") {
	      proc.indexArgs.push(i)
	      if(i < proc.pre.args.length && proc.pre.args[i].count > 0) {
	        throw new Error("cwise: pre() block may not reference array index")
	      }
	      if(i < proc.body.args.length && proc.body.args[i].lvalue) {
	        throw new Error("cwise: body() block may not write to array index")
	      }
	      if(i < proc.post.args.length && proc.post.args[i].count > 0) {
	        throw new Error("cwise: post() block may not reference array index")
	      }
	    } else if(arg_type === "shape") {
	      proc.shapeArgs.push(i)
	      if(i < proc.pre.args.length && proc.pre.args[i].lvalue) {
	        throw new Error("cwise: pre() block may not write to array shape")
	      }
	      if(i < proc.body.args.length && proc.body.args[i].lvalue) {
	        throw new Error("cwise: body() block may not write to array shape")
	      }
	      if(i < proc.post.args.length && proc.post.args[i].lvalue) {
	        throw new Error("cwise: post() block may not write to array shape")
	      }
	    } else if(typeof arg_type === "object" && arg_type.offset) {
	      proc.argTypes[i] = "offset"
	      proc.offsetArgs.push({ array: arg_type.array, offset:arg_type.offset })
	      proc.offsetArgIndex.push(i)
	    } else {
	      throw new Error("cwise: Unknown argument type " + proc_args[i])
	    }
	  }
	  
	  //Make sure at least one array argument was specified
	  if(proc.arrayArgs.length <= 0) {
	    throw new Error("cwise: No array arguments specified")
	  }
	  
	  //Make sure arguments are correct
	  if(proc.pre.args.length > proc_args.length) {
	    throw new Error("cwise: Too many arguments in pre() block")
	  }
	  if(proc.body.args.length > proc_args.length) {
	    throw new Error("cwise: Too many arguments in body() block")
	  }
	  if(proc.post.args.length > proc_args.length) {
	    throw new Error("cwise: Too many arguments in post() block")
	  }

	  //Check debug flag
	  proc.debug = !!user_args.printCode || !!user_args.debug
	  
	  //Retrieve name
	  proc.funcName = user_args.funcName || "cwise"
	  
	  //Read in block size
	  proc.blockSize = user_args.blockSize || 64

	  return createThunk(proc)
	}

	module.exports = compileCwise


/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	"use strict"

	// The function below is called when constructing a cwise function object, and does the following:
	// A function object is constructed which accepts as argument a compilation function and returns another function.
	// It is this other function that is eventually returned by createThunk, and this function is the one that actually
	// checks whether a certain pattern of arguments has already been used before and compiles new loops as needed.
	// The compilation passed to the first function object is used for compiling new functions.
	// Once this function object is created, it is called with compile as argument, where the first argument of compile
	// is bound to "proc" (essentially containing a preprocessed version of the user arguments to cwise).
	// So createThunk roughly works like this:
	// function createThunk(proc) {
	//   var thunk = function(compileBound) {
	//     var CACHED = {}
	//     return function(arrays and scalars) {
	//       if (dtype and order of arrays in CACHED) {
	//         var func = CACHED[dtype and order of arrays]
	//       } else {
	//         var func = CACHED[dtype and order of arrays] = compileBound(dtype and order of arrays)
	//       }
	//       return func(arrays and scalars)
	//     }
	//   }
	//   return thunk(compile.bind1(proc))
	// }

	var compile = __webpack_require__(46)

	function createThunk(proc) {
	  var code = ["'use strict'", "var CACHED={}"]
	  var vars = []
	  var thunkName = proc.funcName + "_cwise_thunk"
	  
	  //Build thunk
	  code.push(["return function ", thunkName, "(", proc.shimArgs.join(","), "){"].join(""))
	  var typesig = []
	  var string_typesig = []
	  var proc_args = [["array",proc.arrayArgs[0],".shape.slice(", // Slice shape so that we only retain the shape over which we iterate (which gets passed to the cwise operator as SS).
	                    Math.max(0,proc.arrayBlockIndices[0]),proc.arrayBlockIndices[0]<0?(","+proc.arrayBlockIndices[0]+")"):")"].join("")]
	  var shapeLengthConditions = [], shapeConditions = []
	  // Process array arguments
	  for(var i=0; i<proc.arrayArgs.length; ++i) {
	    var j = proc.arrayArgs[i]
	    vars.push(["t", j, "=array", j, ".dtype,",
	               "r", j, "=array", j, ".order"].join(""))
	    typesig.push("t" + j)
	    typesig.push("r" + j)
	    string_typesig.push("t"+j)
	    string_typesig.push("r"+j+".join()")
	    proc_args.push("array" + j + ".data")
	    proc_args.push("array" + j + ".stride")
	    proc_args.push("array" + j + ".offset|0")
	    if (i>0) { // Gather conditions to check for shape equality (ignoring block indices)
	      shapeLengthConditions.push("array" + proc.arrayArgs[0] + ".shape.length===array" + j + ".shape.length+" + (Math.abs(proc.arrayBlockIndices[0])-Math.abs(proc.arrayBlockIndices[i])))
	      shapeConditions.push("array" + proc.arrayArgs[0] + ".shape[shapeIndex+" + Math.max(0,proc.arrayBlockIndices[0]) + "]===array" + j + ".shape[shapeIndex+" + Math.max(0,proc.arrayBlockIndices[i]) + "]")
	    }
	  }
	  // Check for shape equality
	  if (proc.arrayArgs.length > 1) {
	    code.push("if (!(" + shapeLengthConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same dimensionality!')")
	    code.push("for(var shapeIndex=array" + proc.arrayArgs[0] + ".shape.length-" + Math.abs(proc.arrayBlockIndices[0]) + "; shapeIndex-->0;) {")
	    code.push("if (!(" + shapeConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same shape!')")
	    code.push("}")
	  }
	  // Process scalar arguments
	  for(var i=0; i<proc.scalarArgs.length; ++i) {
	    proc_args.push("scalar" + proc.scalarArgs[i])
	  }
	  // Check for cached function (and if not present, generate it)
	  vars.push(["type=[", string_typesig.join(","), "].join()"].join(""))
	  vars.push("proc=CACHED[type]")
	  code.push("var " + vars.join(","))
	  
	  code.push(["if(!proc){",
	             "CACHED[type]=proc=compile([", typesig.join(","), "])}",
	             "return proc(", proc_args.join(","), ")}"].join(""))

	  if(proc.debug) {
	    console.log("-----Generated thunk:\n" + code.join("\n") + "\n----------")
	  }
	  
	  //Compile thunk
	  var thunk = new Function("compile", code.join("\n"))
	  return thunk(compile.bind(undefined, proc))
	}

	module.exports = createThunk


/***/ },
/* 46 */
/***/ function(module, exports, __webpack_require__) {

	"use strict"

	var uniq = __webpack_require__(47)

	// This function generates very simple loops analogous to how you typically traverse arrays (the outermost loop corresponds to the slowest changing index, the innermost loop to the fastest changing index)
	// TODO: If two arrays have the same strides (and offsets) there is potential for decreasing the number of "pointers" and related variables. The drawback is that the type signature would become more specific and that there would thus be less potential for caching, but it might still be worth it, especially when dealing with large numbers of arguments.
	function innerFill(order, proc, body) {
	  var dimension = order.length
	    , nargs = proc.arrayArgs.length
	    , has_index = proc.indexArgs.length>0
	    , code = []
	    , vars = []
	    , idx=0, pidx=0, i, j
	  for(i=0; i<dimension; ++i) { // Iteration variables
	    vars.push(["i",i,"=0"].join(""))
	  }
	  //Compute scan deltas
	  for(j=0; j<nargs; ++j) {
	    for(i=0; i<dimension; ++i) {
	      pidx = idx
	      idx = order[i]
	      if(i === 0) { // The innermost/fastest dimension's delta is simply its stride
	        vars.push(["d",j,"s",i,"=t",j,"p",idx].join(""))
	      } else { // For other dimensions the delta is basically the stride minus something which essentially "rewinds" the previous (more inner) dimension
	        vars.push(["d",j,"s",i,"=(t",j,"p",idx,"-s",pidx,"*t",j,"p",pidx,")"].join(""))
	      }
	    }
	  }
	  code.push("var " + vars.join(","))
	  //Scan loop
	  for(i=dimension-1; i>=0; --i) { // Start at largest stride and work your way inwards
	    idx = order[i]
	    code.push(["for(i",i,"=0;i",i,"<s",idx,";++i",i,"){"].join(""))
	  }
	  //Push body of inner loop
	  code.push(body)
	  //Advance scan pointers
	  for(i=0; i<dimension; ++i) {
	    pidx = idx
	    idx = order[i]
	    for(j=0; j<nargs; ++j) {
	      code.push(["p",j,"+=d",j,"s",i].join(""))
	    }
	    if(has_index) {
	      if(i > 0) {
	        code.push(["index[",pidx,"]-=s",pidx].join(""))
	      }
	      code.push(["++index[",idx,"]"].join(""))
	    }
	    code.push("}")
	  }
	  return code.join("\n")
	}

	// Generate "outer" loops that loop over blocks of data, applying "inner" loops to the blocks by manipulating the local variables in such a way that the inner loop only "sees" the current block.
	// TODO: If this is used, then the previous declaration (done by generateCwiseOp) of s* is essentially unnecessary.
	//       I believe the s* are not used elsewhere (in particular, I don't think they're used in the pre/post parts and "shape" is defined independently), so it would be possible to make defining the s* dependent on what loop method is being used.
	function outerFill(matched, order, proc, body) {
	  var dimension = order.length
	    , nargs = proc.arrayArgs.length
	    , blockSize = proc.blockSize
	    , has_index = proc.indexArgs.length > 0
	    , code = []
	  for(var i=0; i<nargs; ++i) {
	    code.push(["var offset",i,"=p",i].join(""))
	  }
	  //Generate loops for unmatched dimensions
	  // The order in which these dimensions are traversed is fairly arbitrary (from small stride to large stride, for the first argument)
	  // TODO: It would be nice if the order in which these loops are placed would also be somehow "optimal" (at the very least we should check that it really doesn't hurt us if they're not).
	  for(var i=matched; i<dimension; ++i) {
	    code.push(["for(var j"+i+"=SS[", order[i], "]|0;j", i, ">0;){"].join("")) // Iterate back to front
	    code.push(["if(j",i,"<",blockSize,"){"].join("")) // Either decrease j by blockSize (s = blockSize), or set it to zero (after setting s = j).
	    code.push(["s",order[i],"=j",i].join(""))
	    code.push(["j",i,"=0"].join(""))
	    code.push(["}else{s",order[i],"=",blockSize].join(""))
	    code.push(["j",i,"-=",blockSize,"}"].join(""))
	    if(has_index) {
	      code.push(["index[",order[i],"]=j",i].join(""))
	    }
	  }
	  for(var i=0; i<nargs; ++i) {
	    var indexStr = ["offset"+i]
	    for(var j=matched; j<dimension; ++j) {
	      indexStr.push(["j",j,"*t",i,"p",order[j]].join(""))
	    }
	    code.push(["p",i,"=(",indexStr.join("+"),")"].join(""))
	  }
	  code.push(innerFill(order, proc, body))
	  for(var i=matched; i<dimension; ++i) {
	    code.push("}")
	  }
	  return code.join("\n")
	}

	//Count the number of compatible inner orders
	// This is the length of the longest common prefix of the arrays in orders.
	// Each array in orders lists the dimensions of the correspond ndarray in order of increasing stride.
	// This is thus the maximum number of dimensions that can be efficiently traversed by simple nested loops for all arrays.
	function countMatches(orders) {
	  var matched = 0, dimension = orders[0].length
	  while(matched < dimension) {
	    for(var j=1; j<orders.length; ++j) {
	      if(orders[j][matched] !== orders[0][matched]) {
	        return matched
	      }
	    }
	    ++matched
	  }
	  return matched
	}

	//Processes a block according to the given data types
	// Replaces variable names by different ones, either "local" ones (that are then ferried in and out of the given array) or ones matching the arguments that the function performing the ultimate loop will accept.
	function processBlock(block, proc, dtypes) {
	  var code = block.body
	  var pre = []
	  var post = []
	  for(var i=0; i<block.args.length; ++i) {
	    var carg = block.args[i]
	    if(carg.count <= 0) {
	      continue
	    }
	    var re = new RegExp(carg.name, "g")
	    var ptrStr = ""
	    var arrNum = proc.arrayArgs.indexOf(i)
	    switch(proc.argTypes[i]) {
	      case "offset":
	        var offArgIndex = proc.offsetArgIndex.indexOf(i)
	        var offArg = proc.offsetArgs[offArgIndex]
	        arrNum = offArg.array
	        ptrStr = "+q" + offArgIndex // Adds offset to the "pointer" in the array
	      case "array":
	        ptrStr = "p" + arrNum + ptrStr
	        var localStr = "l" + i
	        var arrStr = "a" + arrNum
	        if (proc.arrayBlockIndices[arrNum] === 0) { // Argument to body is just a single value from this array
	          if(carg.count === 1) { // Argument/array used only once(?)
	            if(dtypes[arrNum] === "generic") {
	              if(carg.lvalue) {
	                pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
	                code = code.replace(re, localStr)
	                post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
	              } else {
	                code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""))
	              }
	            } else {
	              code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""))
	            }
	          } else if(dtypes[arrNum] === "generic") {
	            pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // TODO: Could we optimize by checking for carg.rvalue?
	            code = code.replace(re, localStr)
	            if(carg.lvalue) {
	              post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
	            }
	          } else {
	            pre.push(["var ", localStr, "=", arrStr, "[", ptrStr, "]"].join("")) // TODO: Could we optimize by checking for carg.rvalue?
	            code = code.replace(re, localStr)
	            if(carg.lvalue) {
	              post.push([arrStr, "[", ptrStr, "]=", localStr].join(""))
	            }
	          }
	        } else { // Argument to body is a "block"
	          var reStrArr = [carg.name], ptrStrArr = [ptrStr]
	          for(var j=0; j<Math.abs(proc.arrayBlockIndices[arrNum]); j++) {
	            reStrArr.push("\\s*\\[([^\\]]+)\\]")
	            ptrStrArr.push("$" + (j+1) + "*t" + arrNum + "b" + j) // Matched index times stride
	          }
	          re = new RegExp(reStrArr.join(""), "g")
	          ptrStr = ptrStrArr.join("+")
	          if(dtypes[arrNum] === "generic") {
	            /*if(carg.lvalue) {
	              pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
	              code = code.replace(re, localStr)
	              post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
	            } else {
	              code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""))
	            }*/
	            throw new Error("cwise: Generic arrays not supported in combination with blocks!")
	          } else {
	            // This does not produce any local variables, even if variables are used multiple times. It would be possible to do so, but it would complicate things quite a bit.
	            code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""))
	          }
	        }
	      break
	      case "scalar":
	        code = code.replace(re, "Y" + proc.scalarArgs.indexOf(i))
	      break
	      case "index":
	        code = code.replace(re, "index")
	      break
	      case "shape":
	        code = code.replace(re, "shape")
	      break
	    }
	  }
	  return [pre.join("\n"), code, post.join("\n")].join("\n").trim()
	}

	function typeSummary(dtypes) {
	  var summary = new Array(dtypes.length)
	  var allEqual = true
	  for(var i=0; i<dtypes.length; ++i) {
	    var t = dtypes[i]
	    var digits = t.match(/\d+/)
	    if(!digits) {
	      digits = ""
	    } else {
	      digits = digits[0]
	    }
	    if(t.charAt(0) === 0) {
	      summary[i] = "u" + t.charAt(1) + digits
	    } else {
	      summary[i] = t.charAt(0) + digits
	    }
	    if(i > 0) {
	      allEqual = allEqual && summary[i] === summary[i-1]
	    }
	  }
	  if(allEqual) {
	    return summary[0]
	  }
	  return summary.join("")
	}

	//Generates a cwise operator
	function generateCWiseOp(proc, typesig) {

	  //Compute dimension
	  // Arrays get put first in typesig, and there are two entries per array (dtype and order), so this gets the number of dimensions in the first array arg.
	  var dimension = (typesig[1].length - Math.abs(proc.arrayBlockIndices[0]))|0
	  var orders = new Array(proc.arrayArgs.length)
	  var dtypes = new Array(proc.arrayArgs.length)
	  for(var i=0; i<proc.arrayArgs.length; ++i) {
	    dtypes[i] = typesig[2*i]
	    orders[i] = typesig[2*i+1]
	  }
	  
	  //Determine where block and loop indices start and end
	  var blockBegin = [], blockEnd = [] // These indices are exposed as blocks
	  var loopBegin = [], loopEnd = [] // These indices are iterated over
	  var loopOrders = [] // orders restricted to the loop indices
	  for(var i=0; i<proc.arrayArgs.length; ++i) {
	    if (proc.arrayBlockIndices[i]<0) {
	      loopBegin.push(0)
	      loopEnd.push(dimension)
	      blockBegin.push(dimension)
	      blockEnd.push(dimension+proc.arrayBlockIndices[i])
	    } else {
	      loopBegin.push(proc.arrayBlockIndices[i]) // Non-negative
	      loopEnd.push(proc.arrayBlockIndices[i]+dimension)
	      blockBegin.push(0)
	      blockEnd.push(proc.arrayBlockIndices[i])
	    }
	    var newOrder = []
	    for(var j=0; j<orders[i].length; j++) {
	      if (loopBegin[i]<=orders[i][j] && orders[i][j]<loopEnd[i]) {
	        newOrder.push(orders[i][j]-loopBegin[i]) // If this is a loop index, put it in newOrder, subtracting loopBegin, to make sure that all loopOrders are using a common set of indices.
	      }
	    }
	    loopOrders.push(newOrder)
	  }

	  //First create arguments for procedure
	  var arglist = ["SS"] // SS is the overall shape over which we iterate
	  var code = ["'use strict'"]
	  var vars = []
	  
	  for(var j=0; j<dimension; ++j) {
	    vars.push(["s", j, "=SS[", j, "]"].join("")) // The limits for each dimension.
	  }
	  for(var i=0; i<proc.arrayArgs.length; ++i) {
	    arglist.push("a"+i) // Actual data array
	    arglist.push("t"+i) // Strides
	    arglist.push("p"+i) // Offset in the array at which the data starts (also used for iterating over the data)
	    
	    for(var j=0; j<dimension; ++j) { // Unpack the strides into vars for looping
	      vars.push(["t",i,"p",j,"=t",i,"[",loopBegin[i]+j,"]"].join(""))
	    }
	    
	    for(var j=0; j<Math.abs(proc.arrayBlockIndices[i]); ++j) { // Unpack the strides into vars for block iteration
	      vars.push(["t",i,"b",j,"=t",i,"[",blockBegin[i]+j,"]"].join(""))
	    }
	  }
	  for(var i=0; i<proc.scalarArgs.length; ++i) {
	    arglist.push("Y" + i)
	  }
	  if(proc.shapeArgs.length > 0) {
	    vars.push("shape=SS.slice(0)") // Makes the shape over which we iterate available to the user defined functions (so you can use width/height for example)
	  }
	  if(proc.indexArgs.length > 0) {
	    // Prepare an array to keep track of the (logical) indices, initialized to dimension zeroes.
	    var zeros = new Array(dimension)
	    for(var i=0; i<dimension; ++i) {
	      zeros[i] = "0"
	    }
	    vars.push(["index=[", zeros.join(","), "]"].join(""))
	  }
	  for(var i=0; i<proc.offsetArgs.length; ++i) { // Offset arguments used for stencil operations
	    var off_arg = proc.offsetArgs[i]
	    var init_string = []
	    for(var j=0; j<off_arg.offset.length; ++j) {
	      if(off_arg.offset[j] === 0) {
	        continue
	      } else if(off_arg.offset[j] === 1) {
	        init_string.push(["t", off_arg.array, "p", j].join(""))      
	      } else {
	        init_string.push([off_arg.offset[j], "*t", off_arg.array, "p", j].join(""))
	      }
	    }
	    if(init_string.length === 0) {
	      vars.push("q" + i + "=0")
	    } else {
	      vars.push(["q", i, "=", init_string.join("+")].join(""))
	    }
	  }

	  //Prepare this variables
	  var thisVars = uniq([].concat(proc.pre.thisVars)
	                      .concat(proc.body.thisVars)
	                      .concat(proc.post.thisVars))
	  vars = vars.concat(thisVars)
	  code.push("var " + vars.join(","))
	  for(var i=0; i<proc.arrayArgs.length; ++i) {
	    code.push("p"+i+"|=0")
	  }
	  
	  //Inline prelude
	  if(proc.pre.body.length > 3) {
	    code.push(processBlock(proc.pre, proc, dtypes))
	  }

	  //Process body
	  var body = processBlock(proc.body, proc, dtypes)
	  var matched = countMatches(loopOrders)
	  if(matched < dimension) {
	    code.push(outerFill(matched, loopOrders[0], proc, body)) // TODO: Rather than passing loopOrders[0], it might be interesting to look at passing an order that represents the majority of the arguments for example.
	  } else {
	    code.push(innerFill(loopOrders[0], proc, body))
	  }

	  //Inline epilog
	  if(proc.post.body.length > 3) {
	    code.push(processBlock(proc.post, proc, dtypes))
	  }
	  
	  if(proc.debug) {
	    console.log("-----Generated cwise routine for ", typesig, ":\n" + code.join("\n") + "\n----------")
	  }
	  
	  var loopName = [(proc.funcName||"unnamed"), "_cwise_loop_", orders[0].join("s"),"m",matched,typeSummary(dtypes)].join("")
	  var f = new Function(["function ",loopName,"(", arglist.join(","),"){", code.join("\n"),"} return ", loopName].join(""))
	  return f()
	}
	module.exports = generateCWiseOp


/***/ },
/* 47 */
/***/ function(module, exports) {

	"use strict"

	function unique_pred(list, compare) {
	  var ptr = 1
	    , len = list.length
	    , a=list[0], b=list[0]
	  for(var i=1; i<len; ++i) {
	    b = a
	    a = list[i]
	    if(compare(a, b)) {
	      if(i === ptr) {
	        ptr++
	        continue
	      }
	      list[ptr++] = a
	    }
	  }
	  list.length = ptr
	  return list
	}

	function unique_eq(list) {
	  var ptr = 1
	    , len = list.length
	    , a=list[0], b = list[0]
	  for(var i=1; i<len; ++i, b=a) {
	    b = a
	    a = list[i]
	    if(a !== b) {
	      if(i === ptr) {
	        ptr++
	        continue
	      }
	      list[ptr++] = a
	    }
	  }
	  list.length = ptr
	  return list
	}

	function unique(list, compare, sorted) {
	  if(list.length === 0) {
	    return list
	  }
	  if(compare) {
	    if(!sorted) {
	      list.sort(compare)
	    }
	    return unique_pred(list, compare)
	  }
	  if(!sorted) {
	    list.sort()
	  }
	  return unique_eq(list)
	}

	module.exports = unique


/***/ },
/* 48 */
/***/ function(module, exports, __webpack_require__) {

	var iota = __webpack_require__(49)
	var isBuffer = __webpack_require__(50)

	var hasTypedArrays  = ((typeof Float64Array) !== "undefined")

	function compare1st(a, b) {
	  return a[0] - b[0]
	}

	function order() {
	  var stride = this.stride
	  var terms = new Array(stride.length)
	  var i
	  for(i=0; i<terms.length; ++i) {
	    terms[i] = [Math.abs(stride[i]), i]
	  }
	  terms.sort(compare1st)
	  var result = new Array(terms.length)
	  for(i=0; i<result.length; ++i) {
	    result[i] = terms[i][1]
	  }
	  return result
	}

	function compileConstructor(dtype, dimension) {
	  var className = ["View", dimension, "d", dtype].join("")
	  if(dimension < 0) {
	    className = "View_Nil" + dtype
	  }
	  var useGetters = (dtype === "generic")

	  if(dimension === -1) {
	    //Special case for trivial arrays
	    var code =
	      "function "+className+"(a){this.data=a;};\
	var proto="+className+".prototype;\
	proto.dtype='"+dtype+"';\
	proto.index=function(){return -1};\
	proto.size=0;\
	proto.dimension=-1;\
	proto.shape=proto.stride=proto.order=[];\
	proto.lo=proto.hi=proto.transpose=proto.step=\
	function(){return new "+className+"(this.data);};\
	proto.get=proto.set=function(){};\
	proto.pick=function(){return null};\
	return function construct_"+className+"(a){return new "+className+"(a);}"
	    var procedure = new Function(code)
	    return procedure()
	  } else if(dimension === 0) {
	    //Special case for 0d arrays
	    var code =
	      "function "+className+"(a,d) {\
	this.data = a;\
	this.offset = d\
	};\
	var proto="+className+".prototype;\
	proto.dtype='"+dtype+"';\
	proto.index=function(){return this.offset};\
	proto.dimension=0;\
	proto.size=1;\
	proto.shape=\
	proto.stride=\
	proto.order=[];\
	proto.lo=\
	proto.hi=\
	proto.transpose=\
	proto.step=function "+className+"_copy() {\
	return new "+className+"(this.data,this.offset)\
	};\
	proto.pick=function "+className+"_pick(){\
	return TrivialArray(this.data);\
	};\
	proto.valueOf=proto.get=function "+className+"_get(){\
	return "+(useGetters ? "this.data.get(this.offset)" : "this.data[this.offset]")+
	"};\
	proto.set=function "+className+"_set(v){\
	return "+(useGetters ? "this.data.set(this.offset,v)" : "this.data[this.offset]=v")+"\
	};\
	return function construct_"+className+"(a,b,c,d){return new "+className+"(a,d)}"
	    var procedure = new Function("TrivialArray", code)
	    return procedure(CACHED_CONSTRUCTORS[dtype][0])
	  }

	  var code = ["'use strict'"]

	  //Create constructor for view
	  var indices = iota(dimension)
	  var args = indices.map(function(i) { return "i"+i })
	  var index_str = "this.offset+" + indices.map(function(i) {
	        return "this.stride[" + i + "]*i" + i
	      }).join("+")
	  var shapeArg = indices.map(function(i) {
	      return "b"+i
	    }).join(",")
	  var strideArg = indices.map(function(i) {
	      return "c"+i
	    }).join(",")
	  code.push(
	    "function "+className+"(a," + shapeArg + "," + strideArg + ",d){this.data=a",
	      "this.shape=[" + shapeArg + "]",
	      "this.stride=[" + strideArg + "]",
	      "this.offset=d|0}",
	    "var proto="+className+".prototype",
	    "proto.dtype='"+dtype+"'",
	    "proto.dimension="+dimension)

	  //view.size:
	  code.push("Object.defineProperty(proto,'size',{get:function "+className+"_size(){\
	return "+indices.map(function(i) { return "this.shape["+i+"]" }).join("*"),
	"}})")

	  //view.order:
	  if(dimension === 1) {
	    code.push("proto.order=[0]")
	  } else {
	    code.push("Object.defineProperty(proto,'order',{get:")
	    if(dimension < 4) {
	      code.push("function "+className+"_order(){")
	      if(dimension === 2) {
	        code.push("return (Math.abs(this.stride[0])>Math.abs(this.stride[1]))?[1,0]:[0,1]}})")
	      } else if(dimension === 3) {
	        code.push(
	"var s0=Math.abs(this.stride[0]),s1=Math.abs(this.stride[1]),s2=Math.abs(this.stride[2]);\
	if(s0>s1){\
	if(s1>s2){\
	return [2,1,0];\
	}else if(s0>s2){\
	return [1,2,0];\
	}else{\
	return [1,0,2];\
	}\
	}else if(s0>s2){\
	return [2,0,1];\
	}else if(s2>s1){\
	return [0,1,2];\
	}else{\
	return [0,2,1];\
	}}})")
	      }
	    } else {
	      code.push("ORDER})")
	    }
	  }

	  //view.set(i0, ..., v):
	  code.push(
	"proto.set=function "+className+"_set("+args.join(",")+",v){")
	  if(useGetters) {
	    code.push("return this.data.set("+index_str+",v)}")
	  } else {
	    code.push("return this.data["+index_str+"]=v}")
	  }

	  //view.get(i0, ...):
	  code.push("proto.get=function "+className+"_get("+args.join(",")+"){")
	  if(useGetters) {
	    code.push("return this.data.get("+index_str+")}")
	  } else {
	    code.push("return this.data["+index_str+"]}")
	  }

	  //view.index:
	  code.push(
	    "proto.index=function "+className+"_index(", args.join(), "){return "+index_str+"}")

	  //view.hi():
	  code.push("proto.hi=function "+className+"_hi("+args.join(",")+"){return new "+className+"(this.data,"+
	    indices.map(function(i) {
	      return ["(typeof i",i,"!=='number'||i",i,"<0)?this.shape[", i, "]:i", i,"|0"].join("")
	    }).join(",")+","+
	    indices.map(function(i) {
	      return "this.stride["+i + "]"
	    }).join(",")+",this.offset)}")

	  //view.lo():
	  var a_vars = indices.map(function(i) { return "a"+i+"=this.shape["+i+"]" })
	  var c_vars = indices.map(function(i) { return "c"+i+"=this.stride["+i+"]" })
	  code.push("proto.lo=function "+className+"_lo("+args.join(",")+"){var b=this.offset,d=0,"+a_vars.join(",")+","+c_vars.join(","))
	  for(var i=0; i<dimension; ++i) {
	    code.push(
	"if(typeof i"+i+"==='number'&&i"+i+">=0){\
	d=i"+i+"|0;\
	b+=c"+i+"*d;\
	a"+i+"-=d}")
	  }
	  code.push("return new "+className+"(this.data,"+
	    indices.map(function(i) {
	      return "a"+i
	    }).join(",")+","+
	    indices.map(function(i) {
	      return "c"+i
	    }).join(",")+",b)}")

	  //view.step():
	  code.push("proto.step=function "+className+"_step("+args.join(",")+"){var "+
	    indices.map(function(i) {
	      return "a"+i+"=this.shape["+i+"]"
	    }).join(",")+","+
	    indices.map(function(i) {
	      return "b"+i+"=this.stride["+i+"]"
	    }).join(",")+",c=this.offset,d=0,ceil=Math.ceil")
	  for(var i=0; i<dimension; ++i) {
	    code.push(
	"if(typeof i"+i+"==='number'){\
	d=i"+i+"|0;\
	if(d<0){\
	c+=b"+i+"*(a"+i+"-1);\
	a"+i+"=ceil(-a"+i+"/d)\
	}else{\
	a"+i+"=ceil(a"+i+"/d)\
	}\
	b"+i+"*=d\
	}")
	  }
	  code.push("return new "+className+"(this.data,"+
	    indices.map(function(i) {
	      return "a" + i
	    }).join(",")+","+
	    indices.map(function(i) {
	      return "b" + i
	    }).join(",")+",c)}")

	  //view.transpose():
	  var tShape = new Array(dimension)
	  var tStride = new Array(dimension)
	  for(var i=0; i<dimension; ++i) {
	    tShape[i] = "a[i"+i+"]"
	    tStride[i] = "b[i"+i+"]"
	  }
	  code.push("proto.transpose=function "+className+"_transpose("+args+"){"+
	    args.map(function(n,idx) { return n + "=(" + n + "===undefined?" + idx + ":" + n + "|0)"}).join(";"),
	    "var a=this.shape,b=this.stride;return new "+className+"(this.data,"+tShape.join(",")+","+tStride.join(",")+",this.offset)}")

	  //view.pick():
	  code.push("proto.pick=function "+className+"_pick("+args+"){var a=[],b=[],c=this.offset")
	  for(var i=0; i<dimension; ++i) {
	    code.push("if(typeof i"+i+"==='number'&&i"+i+">=0){c=(c+this.stride["+i+"]*i"+i+")|0}else{a.push(this.shape["+i+"]);b.push(this.stride["+i+"])}")
	  }
	  code.push("var ctor=CTOR_LIST[a.length+1];return ctor(this.data,a,b,c)}")

	  //Add return statement
	  code.push("return function construct_"+className+"(data,shape,stride,offset){return new "+className+"(data,"+
	    indices.map(function(i) {
	      return "shape["+i+"]"
	    }).join(",")+","+
	    indices.map(function(i) {
	      return "stride["+i+"]"
	    }).join(",")+",offset)}")

	  //Compile procedure
	  var procedure = new Function("CTOR_LIST", "ORDER", code.join("\n"))
	  return procedure(CACHED_CONSTRUCTORS[dtype], order)
	}

	function arrayDType(data) {
	  if(isBuffer(data)) {
	    return "buffer"
	  }
	  if(hasTypedArrays) {
	    switch(Object.prototype.toString.call(data)) {
	      case "[object Float64Array]":
	        return "float64"
	      case "[object Float32Array]":
	        return "float32"
	      case "[object Int8Array]":
	        return "int8"
	      case "[object Int16Array]":
	        return "int16"
	      case "[object Int32Array]":
	        return "int32"
	      case "[object Uint8Array]":
	        return "uint8"
	      case "[object Uint16Array]":
	        return "uint16"
	      case "[object Uint32Array]":
	        return "uint32"
	      case "[object Uint8ClampedArray]":
	        return "uint8_clamped"
	    }
	  }
	  if(Array.isArray(data)) {
	    return "array"
	  }
	  return "generic"
	}

	var CACHED_CONSTRUCTORS = {
	  "float32":[],
	  "float64":[],
	  "int8":[],
	  "int16":[],
	  "int32":[],
	  "uint8":[],
	  "uint16":[],
	  "uint32":[],
	  "array":[],
	  "uint8_clamped":[],
	  "buffer":[],
	  "generic":[]
	}

	;(function() {
	  for(var id in CACHED_CONSTRUCTORS) {
	    CACHED_CONSTRUCTORS[id].push(compileConstructor(id, -1))
	  }
	});

	function wrappedNDArrayCtor(data, shape, stride, offset) {
	  if(data === undefined) {
	    var ctor = CACHED_CONSTRUCTORS.array[0]
	    return ctor([])
	  } else if(typeof data === "number") {
	    data = [data]
	  }
	  if(shape === undefined) {
	    shape = [ data.length ]
	  }
	  var d = shape.length
	  if(stride === undefined) {
	    stride = new Array(d)
	    for(var i=d-1, sz=1; i>=0; --i) {
	      stride[i] = sz
	      sz *= shape[i]
	    }
	  }
	  if(offset === undefined) {
	    offset = 0
	    for(var i=0; i<d; ++i) {
	      if(stride[i] < 0) {
	        offset -= (shape[i]-1)*stride[i]
	      }
	    }
	  }
	  var dtype = arrayDType(data)
	  var ctor_list = CACHED_CONSTRUCTORS[dtype]
	  while(ctor_list.length <= d+1) {
	    ctor_list.push(compileConstructor(dtype, ctor_list.length-1))
	  }
	  var ctor = ctor_list[d+1]
	  return ctor(data, shape, stride, offset)
	}

	module.exports = wrappedNDArrayCtor


/***/ },
/* 49 */
/***/ function(module, exports) {

	"use strict"

	function iota(n) {
	  var result = new Array(n)
	  for(var i=0; i<n; ++i) {
	    result[i] = i
	  }
	  return result
	}

	module.exports = iota

/***/ },
/* 50 */
/***/ function(module, exports) {

	/**
	 * Determine if an object is Buffer
	 *
	 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * License:  MIT
	 *
	 * `npm install is-buffer`
	 */

	module.exports = function (obj) {
	  return !!(
	    obj != null &&
	    obj.constructor &&
	    typeof obj.constructor.isBuffer === 'function' &&
	    obj.constructor.isBuffer(obj)
	  )
	}


/***/ },
/* 51 */
/***/ function(module, exports) {

	//will use gl-vec2/copy at some point..
	module.exports.vec2 = function copy2(out, x, y) {
	    out[0] = x
	    out[1] = y
	    return out
	}

	module.exports.vec3 = function copy3(vec, x, y, z) {
	    vec[0] = x
	    vec[1] = y
	    vec[2] = z
	    return vec
	}

/***/ },
/* 52 */
/***/ function(module, exports) {

	module.exports = function numtype(num, def) {
		return typeof num === 'number'
			? num 
			: (typeof def === 'number' ? def : 0)
	}

/***/ },
/* 53 */
/***/ function(module, exports) {

	module.exports = function texcoord(position, shape, texShape, out) {
	    if (!out)
	        out = [0, 0, 1, 1]

	    position = position || [0, 0]
	    shape = shape || [1, 1]

	    texShape = texShape || shape

	    var invWidth = 1 / texShape[0]
	    var invHeight = 1 / texShape[1]
	    var x = position[0],
	        y = position[1],
	        w = shape[0],
	        h = shape[1]

	    out[0] = x * invWidth
	    out[1] = y * invHeight
	    out[2] = (x + w) * invWidth
	    out[3] = (y + h) * invHeight
	    return out
	}

/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

	//to reduce bundle size, we'll only grab what we need
	module.exports = {
	    ortho: __webpack_require__(56),
	    identity: __webpack_require__(5),
	    create: __webpack_require__(57),
	    scale: __webpack_require__(58),
	    rotateZ: __webpack_require__(59),
	    rotateY: __webpack_require__(55),
	    rotateX: __webpack_require__(60),
	    translate: __webpack_require__(61),
	    clone: __webpack_require__(62),
	    multiply: __webpack_require__(63)
	}


/***/ },
/* 55 */
/***/ function(module, exports) {

	module.exports = rotateY;

	/**
	 * Rotates a matrix by the given angle around the Y axis
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	function rotateY(out, a, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad),
	        a00 = a[0],
	        a01 = a[1],
	        a02 = a[2],
	        a03 = a[3],
	        a20 = a[8],
	        a21 = a[9],
	        a22 = a[10],
	        a23 = a[11];

	    if (a !== out) { // If the source and destination differ, copy the unchanged rows
	        out[4]  = a[4];
	        out[5]  = a[5];
	        out[6]  = a[6];
	        out[7]  = a[7];
	        out[12] = a[12];
	        out[13] = a[13];
	        out[14] = a[14];
	        out[15] = a[15];
	    }

	    // Perform axis-specific matrix multiplication
	    out[0] = a00 * c - a20 * s;
	    out[1] = a01 * c - a21 * s;
	    out[2] = a02 * c - a22 * s;
	    out[3] = a03 * c - a23 * s;
	    out[8] = a00 * s + a20 * c;
	    out[9] = a01 * s + a21 * c;
	    out[10] = a02 * s + a22 * c;
	    out[11] = a03 * s + a23 * c;
	    return out;
	};

/***/ },
/* 56 */
/***/ function(module, exports) {

	module.exports = ortho;

	/**
	 * Generates a orthogonal projection matrix with the given bounds
	 *
	 * @param {mat4} out mat4 frustum matrix will be written into
	 * @param {number} left Left bound of the frustum
	 * @param {number} right Right bound of the frustum
	 * @param {number} bottom Bottom bound of the frustum
	 * @param {number} top Top bound of the frustum
	 * @param {number} near Near bound of the frustum
	 * @param {number} far Far bound of the frustum
	 * @returns {mat4} out
	 */
	function ortho(out, left, right, bottom, top, near, far) {
	    var lr = 1 / (left - right),
	        bt = 1 / (bottom - top),
	        nf = 1 / (near - far);
	    out[0] = -2 * lr;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = -2 * bt;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = 2 * nf;
	    out[11] = 0;
	    out[12] = (left + right) * lr;
	    out[13] = (top + bottom) * bt;
	    out[14] = (far + near) * nf;
	    out[15] = 1;
	    return out;
	};

/***/ },
/* 57 */
/***/ function(module, exports) {

	module.exports = create;

	/**
	 * Creates a new identity mat4
	 *
	 * @returns {mat4} a new 4x4 matrix
	 */
	function create() {
	    var out = new Float32Array(16);
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = 1;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = 1;
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	};

/***/ },
/* 58 */
/***/ function(module, exports) {

	module.exports = scale;

	/**
	 * Scales the mat4 by the dimensions in the given vec3
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to scale
	 * @param {vec3} v the vec3 to scale the matrix by
	 * @returns {mat4} out
	 **/
	function scale(out, a, v) {
	    var x = v[0], y = v[1], z = v[2];

	    out[0] = a[0] * x;
	    out[1] = a[1] * x;
	    out[2] = a[2] * x;
	    out[3] = a[3] * x;
	    out[4] = a[4] * y;
	    out[5] = a[5] * y;
	    out[6] = a[6] * y;
	    out[7] = a[7] * y;
	    out[8] = a[8] * z;
	    out[9] = a[9] * z;
	    out[10] = a[10] * z;
	    out[11] = a[11] * z;
	    out[12] = a[12];
	    out[13] = a[13];
	    out[14] = a[14];
	    out[15] = a[15];
	    return out;
	};

/***/ },
/* 59 */
/***/ function(module, exports) {

	module.exports = rotateZ;

	/**
	 * Rotates a matrix by the given angle around the Z axis
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	function rotateZ(out, a, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad),
	        a00 = a[0],
	        a01 = a[1],
	        a02 = a[2],
	        a03 = a[3],
	        a10 = a[4],
	        a11 = a[5],
	        a12 = a[6],
	        a13 = a[7];

	    if (a !== out) { // If the source and destination differ, copy the unchanged last row
	        out[8]  = a[8];
	        out[9]  = a[9];
	        out[10] = a[10];
	        out[11] = a[11];
	        out[12] = a[12];
	        out[13] = a[13];
	        out[14] = a[14];
	        out[15] = a[15];
	    }

	    // Perform axis-specific matrix multiplication
	    out[0] = a00 * c + a10 * s;
	    out[1] = a01 * c + a11 * s;
	    out[2] = a02 * c + a12 * s;
	    out[3] = a03 * c + a13 * s;
	    out[4] = a10 * c - a00 * s;
	    out[5] = a11 * c - a01 * s;
	    out[6] = a12 * c - a02 * s;
	    out[7] = a13 * c - a03 * s;
	    return out;
	};

/***/ },
/* 60 */
/***/ function(module, exports) {

	module.exports = rotateX;

	/**
	 * Rotates a matrix by the given angle around the X axis
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	function rotateX(out, a, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad),
	        a10 = a[4],
	        a11 = a[5],
	        a12 = a[6],
	        a13 = a[7],
	        a20 = a[8],
	        a21 = a[9],
	        a22 = a[10],
	        a23 = a[11];

	    if (a !== out) { // If the source and destination differ, copy the unchanged rows
	        out[0]  = a[0];
	        out[1]  = a[1];
	        out[2]  = a[2];
	        out[3]  = a[3];
	        out[12] = a[12];
	        out[13] = a[13];
	        out[14] = a[14];
	        out[15] = a[15];
	    }

	    // Perform axis-specific matrix multiplication
	    out[4] = a10 * c + a20 * s;
	    out[5] = a11 * c + a21 * s;
	    out[6] = a12 * c + a22 * s;
	    out[7] = a13 * c + a23 * s;
	    out[8] = a20 * c - a10 * s;
	    out[9] = a21 * c - a11 * s;
	    out[10] = a22 * c - a12 * s;
	    out[11] = a23 * c - a13 * s;
	    return out;
	};

/***/ },
/* 61 */
/***/ function(module, exports) {

	module.exports = translate;

	/**
	 * Translate a mat4 by the given vector
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to translate
	 * @param {vec3} v vector to translate by
	 * @returns {mat4} out
	 */
	function translate(out, a, v) {
	    var x = v[0], y = v[1], z = v[2],
	        a00, a01, a02, a03,
	        a10, a11, a12, a13,
	        a20, a21, a22, a23;

	    if (a === out) {
	        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
	        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
	        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
	        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
	    } else {
	        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
	        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
	        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

	        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
	        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
	        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

	        out[12] = a00 * x + a10 * y + a20 * z + a[12];
	        out[13] = a01 * x + a11 * y + a21 * z + a[13];
	        out[14] = a02 * x + a12 * y + a22 * z + a[14];
	        out[15] = a03 * x + a13 * y + a23 * z + a[15];
	    }

	    return out;
	};

/***/ },
/* 62 */
/***/ function(module, exports) {

	module.exports = clone;

	/**
	 * Creates a new mat4 initialized with values from an existing matrix
	 *
	 * @param {mat4} a matrix to clone
	 * @returns {mat4} a new 4x4 matrix
	 */
	function clone(a) {
	    var out = new Float32Array(16);
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    out[4] = a[4];
	    out[5] = a[5];
	    out[6] = a[6];
	    out[7] = a[7];
	    out[8] = a[8];
	    out[9] = a[9];
	    out[10] = a[10];
	    out[11] = a[11];
	    out[12] = a[12];
	    out[13] = a[13];
	    out[14] = a[14];
	    out[15] = a[15];
	    return out;
	};

/***/ },
/* 63 */
/***/ function(module, exports) {

	module.exports = multiply;

	/**
	 * Multiplies two mat4's
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the first operand
	 * @param {mat4} b the second operand
	 * @returns {mat4} out
	 */
	function multiply(out, a, b) {
	    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
	        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
	        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
	        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

	    // Cache only the current line of the second matrix
	    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
	    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

	    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
	    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

	    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
	    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

	    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
	    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
	    return out;
	};

/***/ },
/* 64 */
/***/ function(module, exports, __webpack_require__) {

	var mat4 = __webpack_require__(54)
	var copy3 = __webpack_require__(51).vec3
	var number = __webpack_require__(52)

	var tmpVec3 = [0, 0, 0]

	module.exports = {

	    save: function() {
	        this.transformStack.push(mat4.clone(this.transform))
	        return this
	    },

	    restore: function() {
	        if (this.transformStack.length > 0) {
	            var t = this.transformStack.pop()
	            this.transform = t
	        }
	        return this
	    },

	    scale: function(x, y) {
	        x = number(x, 1)
	        y = number(y, 1)
	        mat4.scale(this.transform, this.transform, copy3(tmpVec3, x, y, 1))
	        return this
	    },

	    translate: function(x, y) {
	        x = x||0
	        y = y||0
	        mat4.translate(this.transform, this.transform, copy3(tmpVec3, x, y, 0))
	        return this
	    },

	    rotateZ: function(rad) {
	        rad = rad||0
	        mat4.rotateZ(this.transform, this.transform, rad)
	        return this
	    },

	    rotateY: function(rad) {
	        rad = rad||0
	        mat4.rotateY(this.transform, this.transform, rad)
	        return this
	    },

	    rotateX: function(rad) {
	        rad = rad||0
	        mat4.rotateX(this.transform, this.transform, rad)
	        return this
	    },

	    transformMat4: function(matrix4x4) {
	        mat4.multiply(this.transform, this.transform, matrix4x4)
	        return this
	    },

	    rotate: function(rad) {
	        this.rotateZ(rad)
	        return this
	    },

	    identity: function() {
	        mat4.identity(this.transform)
	        return this
	    }

	}

/***/ }
/******/ ]);