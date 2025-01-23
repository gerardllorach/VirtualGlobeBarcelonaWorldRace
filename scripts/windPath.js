


function windPath(lat, llong, rad, on_complete){


	var that = this;

	this.Twind = GL.Texture.fromURL("wind/00.png", {minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR},
		function(t){
			that.init(t, lat, llong, rad);
			if (on_complete)
				on_complete();

		});

	this.TwindScale = GL.Texture.fromURL("wind/windScale.png", {minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
	this.alphaIt = 0;

}

windPath.prototype.init = function(texture, lat, llong, rad){

	
	var data = texture.getPixels();

	this.Twind2 = new Texture(512, 256);
	this.Twind2.uploadData(data);

	

	var radius = rad;
	var latitudeBands = lat;
	var longitudeBands = llong;

	var numPoints = lat * llong;


	var numExtravertices = 4;

	// Allocate memory
	var vertexPositionData = new Float32Array( (latitudeBands+1)*(longitudeBands+1)*3 * (numExtravertices + 3));
	var normalData = new Float32Array( (latitudeBands+1)*(longitudeBands+1)*3 * (numExtravertices + 3));
	var indexData = new Uint16Array( latitudeBands*longitudeBands*2 );

	var latRange = Math.PI;
	var i = 0; var vcolor = 0;

	var uv = vec2.create(); // [u , v]
	var vertex = vec3.create(); // [x, y, z]
	var windInf = vec2.create(); // [angle (rad), intensity]


	for (var n = 0; n < numPoints; n++){


		var theta = Math.acos(1-2*Math.random());
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);

		var phi = 2*Math.PI*Math.random();
		var sinPhi = Math.sin(phi);
		var cosPhi = Math.cos(phi);

		vertex[0] = cosPhi * sinTheta;
		vertex[1] = cosTheta;
		vertex[2] = sinPhi * sinTheta;

		// Normalize from 0 to 1. Warning: the texture is Y-flipped. windData rendering uses a flipped texture, to reverse the provided one.
		uv[0] = 1 - phi / (2 * Math.PI);
		uv[1] = 1 - theta / Math.PI;


		// Empty vertex to separate lines
		vertexPositionData.set([radius * vertex[0],radius * vertex[1],radius * vertex[2]], i);
		normalData.set([0,0, 1],i);
		i += 3;


		// Get wind information
		getPixelDataFromUV(windInf, data, texture.width, texture.height, uv);

		// Add vertex to buffer
		vertexPositionData.set([radius * vertex[0],radius * vertex[1],radius * vertex[2]], i);
		normalData.set([1,1, windInf[1]],i);
		i += 3;


		// Calculate new vertices (numExtraVertices more)
		var step = 0.005;


		for (var indV = 0 ; indV < numExtravertices; indV++){
			// Calculate new point
			getPixelDataFromUV(windInf, data, texture.width, texture.height, uv);
			findNewUV(uv, uv, windInf, step*0.1 + 2*step*windInf[1]);
			UVtoXYZ(vertex, uv);

			// Assign new point
			vertexPositionData.set([radius * vertex[0],radius * vertex[1],radius * vertex[2]], i);
			normalData.set([1,2 + indV, windInf[1]],i);
			i += 3;
		}

		// Empty vertex to separate lines
		vertexPositionData.set([radius * vertex[0],radius * vertex[1],radius * vertex[2]], i);
		normalData.set([0,0, 1],i);
		i += 3;
		
	}



	var buffers = {
		vertices: vertexPositionData,
		normals: normalData
	};

	this.mesh = Mesh.load(buffers);
}



// data information:
// index -> angle (0 to 180)
// index +1 -> intensity
// index +2 -> angle sign
// returns angle (-180 to 180) and intensity
function getPixelDataFromUV(out, data, width, height, uv){
	var uN = Math.floor(uv[0]*width);
	var vN = Math.floor(uv[1]*(height-1));

	var index = (uN + vN * width) * 4;

	var sign = data[index+2] > 90 ? -1 : 1;

	out[0] = data[index] * sign * DEG2RAD;
	out[1] = data[index +1]/255;

	return out;
}

function findNewUV(out, uv, windInf, step){

		out[0] = uv[0] + step * Math.cos(windInf[0]);
		out[1] = uv[1] + step * Math.sin(windInf[0]);

		// Out of range
		out[0] = out[0] > 1.0 ? out[0] - 1 : out[0];
		out[0] = out[0] < 0 ? out[0] + 1 : out[0];
		out[1] = out[1] > 1.0 ? out[1] - 1 : out[1];
		out[1] = out[1] < 0 ? out[1] + 1 : out[1];

		return out;
}

function UVtoXYZ(out, uv){
	var theta = (1 - uv[1]) * Math.PI;
	var sinTheta = Math.sin(theta);
	var cosTheta = Math.cos(theta);

	var phi = (1 - uv[0]) * 2*Math.PI;
	var sinPhi = Math.sin(phi);
	var cosPhi = Math.cos(phi);

	out[0] = cosPhi * sinTheta;
	out[1] = cosTheta;
	out[2] = sinPhi * sinTheta;

	if (vec3.normalize(vec3.create(), out)>1 || vec3.normalize(vec3.create(), out)<1)
		console.log(uv);

	return out;
}



windPath.prototype.draw = function (shader, mvp){
	gl.enable(gl.BLEND );
	gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
	//gl.depthMask(false);

	this.TwindScale.bind(5);

	if (this.mesh != undefined)
	shader.uniforms({
		u_pointSize: 4,
		u_scale: 5,
		u_alpha: this.alphaIt,
		u_mvp: mvp
	}).draw(this.mesh, gl.LINE_STRIP);


	this.TwindScale.unbind(5);

	gl.disable(gl.BLEND );

}



windPath.prototype.update = function(dt){

	// UPDATE
	var alphatemp = this.alphaIt;
	this.alphaIt = (alphatemp + 0.1);
}

