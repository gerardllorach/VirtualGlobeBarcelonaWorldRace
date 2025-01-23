


function sun(){
	// load textures
	// TODO: load one texture and extract others
	this.sun0 = GL.Texture.fromURL("images/sun.jpg", {minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
	this.texRays = GL.Texture.fromURL("images/sunRays.jpg", {minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
	this.texFlare0 = GL.Texture.fromURL("images/sunFlare0.jpg", {minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
	this.texFlare1 = GL.Texture.fromURL("images/sunFlare1.jpg", {minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
	this.texFlare2 = GL.Texture.fromURL("images/sunFlare2.jpg", {minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
	this.texFlare3 = GL.Texture.fromURL("images/sunFlare3.jpg", {minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
	this.texFlare4 = GL.Texture.fromURL("images/sunFlare4.jpg", {minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
	this.texFlare5 = GL.Texture.fromURL("images/sunFlare5.jpg", {minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
	this.texFlare6 = GL.Texture.fromURL("images/sunFlare6.jpg", {minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
	
	
}

sun.prototype.init = function(angle)
{

	this.angle = angle;
	
	
	this.model = mat4.create();
	this.mesh = Mesh.plane({size: 30.0});
	this.rays = Mesh.plane({size: 20.0});
	this.flare1 = Mesh.plane({size: 20.0});

}


//rendering loop
sun.prototype.draw = function(shader, camPos, mvp)
{


	gl.enable(gl.BLEND );
	//gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
	gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
	gl.depthMask(false);

	this.sun0.bind(5);

	shader.uniforms({
		u_texture: 5,
		u_color: [1,1,1,1],
		u_mvp: mvp
	}).draw(this.mesh, gl.TRIANGLES);

	this.sun0.unbind(5);

	gl.disable(gl.BLEND );
	gl.depthMask(true);


}


function drawFlares (){
	gl.enable(gl.BLEND );
	gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
	gl.depthMask(false);


	// Screen position
	var sunScreenPos = camera.project(lightPos);
	vec3.multiply (sunScreenPos, sunScreenPos, [1/gl.canvas.width, 1/ gl.canvas.height, 1.0]);
	//console.log(sunScreenPos);

	var sunPos = lightPos;
	var collision = geo.testRaySphere(camPos, vec3.subtract(vec3.create(),sunPos,camPos), [0,0,0], 0.98, vec3.create());


	if (sunScreenPos[0]<1.0 && sunScreenPos[1]<1.0 && sunScreenPos[0]>0.0 && sunScreenPos[1]>0.0 && sunScreenPos[2]<1.0 && !collision){

		drawFlare("sunRays", sunScreenPos, 300, 1, [1,1,1,0.05]);
		drawFlare("fl4", sunScreenPos, 100, 1, [1,1,1,0.8]);
		drawFlare("fl3", sunScreenPos, 100, 1, [1,1,1,0.1]);
		drawFlare("fl2", sunScreenPos, 30, 1.08, [0.8,0.8,1,0.09]);
		drawFlare("fl1", sunScreenPos, 400, 1.1, [1,0.8,0.0,0.02]);
		drawFlare("fl1", sunScreenPos, 600, 1.2, [1,0.8,0.0,0.04]);

		// Flare increases intensity when near the sunset
		var factor = Math.pow(-vec3.dot(vec3.normalize(vec3.create(),camPos), vec3.normalize(vec3.create(), sunPos)) + 0.06, 10.0);
		if (factor > 0.0) {
			drawFlare("fl5", sunScreenPos, 1500, 1.0, [1,1,1, factor*0.2 +0.08]);
		}

		drawFlare("fl1", sunScreenPos, 5, -0.1, [1,0.8,0,0.07]);
		drawFlare("fl1", sunScreenPos, 20, 0.3, [1,0.8,0,0.05]);
		drawFlare("fl1", sunScreenPos, 50, 0.4, [1,0.8,0.0,0.04]);


		drawFlare("fl1", sunScreenPos, 10, -0.3, [0.6,0.6,1,0.05]);
		drawFlare("fl1", sunScreenPos, 25, -0.32, [0.6,0.6,1,0.05]);
		drawFlare("fl1", sunScreenPos, 17, -0.22, [0.5,0.5,1,0.07]);


		drawFlare("fl2", sunScreenPos, 80, -0.5, [1,0.8,0.0,0.05]);
		drawFlare("fl1", sunScreenPos, 30, -0.55, [1,1,0.0,0.02]);

		
		drawFlare("fl1", sunScreenPos, 120, -0.8, [1,0.8,0.0,0.03]);
		drawFlare("fl0", sunScreenPos, 200, -1, [1,1,1,0.05]);
		drawFlare("fl4", sunScreenPos, 50, -1.2, [1,1,1,0.05]);
		drawFlare("fl3", sunScreenPos, 300, -1.4, [1,1,1,0.1]);
	}

	gl.disable(gl.BLEND );
	gl.depthMask(true);
}

function drawFlare(texture_name, pos, size_t, displacement, color){
	
	// Sun screen position (upper-left: [0,1], upper-right: [1,1], lower-left: [0,0], lower-right: [1,0])
	var position = vec3.copy(vec3.create(), pos);
	
	// Flare position (change coordinates to center [0,0] in the middle of the screen)
	vec3.multiply(position, position, [2,2,2]);
	vec3.add(position, position, [-1, -1, -1]);
	vec3.multiply(position, position, [displacement, displacement, displacement]);

	// To pixel coordinates
	position[1]*=-1;
	vec3.add(position, position, [1, 1, 1]);
	vec3.multiply(position, position, [0.5,0.5,0.0]);

	var texture = renderer.textures[texture_name];

	gl.drawTexture(
		texture, 
		(position[0]*gl.canvas.width) - size_t/2,
		position[1]*gl.canvas.height - size_t/2,
		size_t,size_t,
		0,0, texture.width,texture.height,
		undefined,
		{u_color: color});
}




