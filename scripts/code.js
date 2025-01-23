
document.body.style.overflow = "hidden"
// Create context or gl
var context = GL.create({width: window.innerWidth, height: window.innerHeight});
context.canvas.style.marginLeft = "-10px";
context.canvas.style.marginTop = "-10px";
document.body.appendChild(context.canvas);

// Create renderer (rendeer.js)
var renderer = new RD.Renderer(context);
renderer.sort_by_priority = false;
context.animate();



// INIT GLOBAL VARIABLES
var scene = new RD.Scene();
//var meter = new FPSMeter();
var stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';
document.body.appendChild( stats.domElement );


// CAMERA
var camPosLatLong = [20,-5, 3.0];
var camPos = vec3.create();
vec3.polarToCartesian(camPos, [camPosLatLong[2], camPosLatLong[0] * DEG2RAD, (camPosLatLong[1] -90) * DEG2RAD]);

var camera = new RD.Camera();
camera.perspective(45, gl.canvas.width / gl.canvas.height, 0.1, 1000);
camera.lookAt (camPos, vec3.create(), [0,1,0]);


// LIGHT
var lightPos = vec3.create();
var lightDir = vec3.create();
var ii = -120.0;
vec3.polarToCartesian(lightPos,  [80, DEG2RAD * -17 , DEG2RAD * -120]);
vec3.multiply(lightPos, lightPos, [0.4, 0.4, 0.4]);
vec3.normalize(lightDir, lightPos);


// RENDER TO TEXTURE
var fxTexture = new Texture(gl.canvas.width, gl.canvas.height);
var boatsPathTexture = new Texture (4096, 2048);
var boatsPathBlurTexture = new Texture (4096*0.5, 2048*0.5);
renderer.textures["boatsPath"] = boatsPathTexture;
renderer.textures["boatsPathBlur"] = boatsPathBlurTexture;


// Generic meshes
renderer.meshes["sphere"] = GL.Mesh.sphere({radius: 1, lat: 60, "long": 60});
renderer.meshes["cube"] = GL.Mesh.cube({size: 100});


// Skybox
var skybox = new RD.SceneNode();
skybox.mesh = "cube";
skybox.texture = "stars";
skybox.shader = "skybox";
skybox._uniforms = {u_brightness: 0.6};
skybox.flags = {flip_normals: true};
renderer.loadTexture("images/stars0.jpg", {name: "stars", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR, wrap: gl.CLAMP_TO_BORDER});



// Sun
var mySun = new RD.Billboard();
mySun.mesh = "plane";
mySun.position = lightPos;
mySun.scale(10);
mySun.texture = "sun";
mySun.shader = "sun";
mySun.flags =  {flip_normals: true, blend: true, depth_write: false};
mySun.blendMode = "additive";
renderer.loadTexture("images/sun.jpg", {name: "sun", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});



// Sun Flares
var sunFlares = new RD.SceneNode();
sunFlares.position = lightPos;
sunFlares.textures = ["sunRays", "fl0", "fl1", "fl2", "fl3", "fl4", "fl5", "fl6"];
renderer.loadTexture("images/sunRays.jpg", {name: "sunRays", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
renderer.loadTexture("images/sunFlare0.jpg", {name: "fl0", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
renderer.loadTexture("images/sunFlare1.jpg", {name: "fl1", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
renderer.loadTexture("images/sunFlare2.jpg", {name: "fl2", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
renderer.loadTexture("images/sunFlare3.jpg", {name: "fl3", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
renderer.loadTexture("images/sunFlare4.jpg", {name: "fl4", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
renderer.loadTexture("images/sunFlare5.jpg", {name: "fl5", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
renderer.loadTexture("images/sunFlare6.jpg", {name: "fl6", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});



// Earth
var earth = new RD.SceneNode();
earth.mesh = "sphere";
earth.textures = ["earth", "night", "specular", "normals"];
earth.shader = "earth";
earth._uniforms = {u_color: [1,1,1,1], u_lightvector: lightDir, u_camPos: camPos, u_model: earth.model};
renderer.loadTexture("images/earth0.jpg", {name: "earth", minFilter: gl.NEAREST, magFilter: gl.LINEAR}); // {preview: "images/earth1.jpg"}
renderer.loadTexture("images/night1.jpg", {name: "night", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
renderer.loadTexture("images/specular0.jpg", {name: "specular", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
renderer.loadTexture("images/normals0.jpg", {name: "normals", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});



// Atmosphere
var atmosphere = new RD.SceneNode();
atmosphere.mesh = "sphere";
atmosphere.scale(1.1);
atmosphere.texture = "atmosphere";
atmosphere.shader = "atmosphere";
atmosphere.flags = {blend: true, two_sided: true};
atmosphere._render_priority = RD.PRIORITY_OPAQUE -1;
atmosphere._uniforms = {u_earthRad: 1, u_atmsRad: 1.1, u_camPos: camPos, u_sunDir: lightDir, u_model: atmosphere.model}; // use _local_matrix instead
renderer.loadTexture("images/atms.jpg", {name: "atmosphere", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR, wrap: gl.CLAMP_TO_BORDER});



// Clouds
var clouds = new RD.SceneNode();
clouds.mesh = "sphere";
clouds.scale(1.015);
clouds.texture = "clouds";
clouds.shader = "clouds";
clouds.flags = {blend: true, depth_write: false};
clouds.blendMode = "additive";
clouds._uniforms = {u_lightvector: lightDir, u_model: clouds._global_matrix};
renderer.loadTexture("images/clouds.jpg", {name: "clouds", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR, wrap: gl.MIRROR});
clouds.flags.visible = false;


// Wind
var myWindPath = new windPath(200, 200, 1.0, windPathLoaded);

var wind = new RD.SceneNode();
wind.mesh = "windPath";
wind.texture = "windScale";
wind.shader = "windPath";
wind.flags = {blend: true, visible: false};
wind.blendMode = "additive";
wind.it = 0;
wind._uniforms = {u_alpha: wind.it};
wind.primitive = gl.LINE_STRIP;
renderer.loadTexture("wind/windScale.png", {name: "windScale", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});
function windPathLoaded(){
	renderer.meshes["windPath"] = myWindPath.mesh;
}



// Boats path
var boatsPath = new RD.SceneNode();
boatsPath.mesh = "sphere";
boatsPath.scale(1.01);
boatsPath.texture = "boatsPathPrec";
boatsPath.shader = "skybox";
boatsPath.brightness = 1.0;
boatsPath._uniforms = {u_brightness: boatsPath.brightness};
boatsPath.flags.depth_write = false;
boatsPath.flags.blend = true;
//boatsPath.blendMode = "additive";
var progress = 0;
var prevProgress = 0;
renderer.loadTexture("images/boatsPath.png", {name: "boatsPathPrec", minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR});


// Boat Lines
var boatLines = new RD.SceneNode();
boatLines.mesh = "mesh_boatLines";
boatLines.shader = "boat";
boatLines.primitive = gl.LINES;
boatLines._uniforms = {u_color: [1.0,1.0,1.0, 0.1], u_trailLength: 0.6};//, u_calcTime: scene.time};
boatLines.flags.blend = true;
boatLines.flags.depth_write = false;
//boatLines.blendMode = "additive";


// Selected boats
var boatsSelected = new RD.SceneNode();
boatsSelected.mesh = "mesh_boatsSelected";
boatsSelected.shader = "boatSel";
boatsSelected.primitive = gl.LINE_STRIP;
boatsSelected._uniforms = {u_color: [1.0, 0.2, 0.2, 1.0], u_minA: 1.0};
boatsSelected.flags.blend = true;
boatsSelected.flags.depth_write = false;











// SCENE TREE
scene.root.addChild(skybox);
scene.root.addChild(mySun);
scene.root.addChild(sunFlares);
scene.root.addChild(earth);
scene.root.addChild(atmosphere);
earth.addChild (wind);
earth.addChild(boatsPath);
earth.addChild(clouds);
earth.addChild(boatLines);
earth.addChild(boatsSelected);







// SHADERS
function loadShaders(){
	GL.loadFileAtlas("shaders.txt", function(files){
		renderer.shaders["point"] = new GL.Shader(files["point.vs"], files["point.fs"]);
		renderer.shaders["skybox"] = new GL.Shader(files["skybox.vs"], files["skybox.fs"]);
		renderer.shaders["sun"] = new GL.Shader(files["sun.vs"], files["sun.fs"]);
		renderer.shaders["earth"] = new GL.Shader(files["earth.vs"], files["earth.fs"]);
		renderer.shaders["clouds"] = new GL.Shader(files["clouds.vs"], files["clouds.fs"]);
		renderer.shaders["atmosphere"] = new GL.Shader(files["atmosphere.vs"], files["atmosphere.fs"]);
		renderer.shaders["wind"] = new GL.Shader(files["wind.vs"], files["wind.fs"]);
		renderer.shaders["windPath"] = new GL.Shader(files["windPath.vs"], files["windPath.fs"]);
		renderer.shaders["boat"] = new GL.Shader(files["boat.vs"], files["boat.fs"]);
		renderer.shaders["boatSel"] = new GL.Shader(files["boatSel.vs"], files["boatSel.fs"]);
		renderer.shaders["boatsPath"] = new GL.Shader(files["boatsPath.vs"], files["boatsPath.fs"]);
		renderer.shaders["blur"] = new GL.Shader(files["blur.vs"], files["blur.fs"]);
		renderer.shaders["fx"] = new GL.Shader(files["fx.vs"], files["fx.fs"]);
	});
}

loadShaders();









// EVENTS
gl.captureMouse(true);
gl.onmousemove = function (e)
{
	if (e.dragging)
	{
		if (camPosLatLong[0] + e.deltay * 0.1 < 90 && camPosLatLong[0] + e.deltay * 0.1 > -90)
			camPosLatLong[0] += e.deltay * 0.1;
		camPosLatLong[1] -= e.deltax * 0.05;
		vec3.polarToCartesian(camPos, [camPosLatLong[2], camPosLatLong[0] * DEG2RAD, (camPosLatLong[1] -90) * DEG2RAD]);
		camera.position = camPos;
	}
}

gl.onmousewheel = function (e)
{
	if (e.wheelDelta)
	{	
		if (camPosLatLong[2] - e.wheel * 0.001 > 1.1 && camPosLatLong[2] - e.wheel * 0.001 < 5.0){
			camPosLatLong[2] -= e.wheel*0.001;
			vec3.polarToCartesian(camPos, [camPosLatLong[2], camPosLatLong[0] * DEG2RAD, (camPosLatLong[1] -90) * DEG2RAD]);
			camera.position = camPos;
		} 
	}
}

context.captureKeys(true);

gl.onkeydown = function(e){
	if(e.character=="p"){
		loadShaders();
	}
	if (e.keyCode == 13){
		scene.time = 0;
	}
}





// GUI
var gui = new dat.GUI();

var guiOptions = {"Show Winds": false, "Hide Clouds": true, "Angle": ii, "Rotation speed": 0.0, "Rotate space": false, 
"Load Data State": false, "Boats to render": 1000, "Loading...": 0, "Processing...": 0, "Simulation Progress": 0.0, "Simulation Speed": 1.0, 
"Real Sun Position": false, "Show Real Boats": false,
"Extra vertices": 15, "Vertex Skip": 0, "Alpha Boat Lines": 1};

guiOptions["Load Data"] = function(){
	guiOptions["Load Data State"] = true;
}
guiOptions["Restart Simulation"] = function(){
		// Restart simulation
		renderer.meshes["mesh_boatsPos"] = null;
		renderer.meshes["mesh_boatLines"] = null;
		scene.time = 0;
		prevProgress = 0;
		guiOptions["Simulation Progress"]  = 0;
		myWorker.postMessage({"function": "restart"});
	}



// Boats Data
var guiBoats = gui.addFolder("Boats Data");
	guiBoats.add(guiOptions, "Load Data");
	guiBoats.add(guiOptions, "Boats to render", 1, 17000).step(1);
	guiBoats.add(guiOptions, "Loading...", 0.0, 1.0).listen();
	guiBoats.add(guiOptions, "Processing...", 0.0, 1.0).listen();

	guiBoats.open();


// Simulation
var guiBSimulation = gui.addFolder("Simulation");
	guiBSimulation.add(guiOptions, "Simulation Progress", 0.0, 1.0).listen();
	guiBSimulation.add(guiOptions, "Simulation Speed", 0.0, 5.0);
	guiBSimulation.add(guiOptions, "Restart Simulation");
	guiBSimulation.add(guiOptions, "Real Sun Position", true, false);
	guiBSimulation.add(guiOptions, "Show Real Boats", true, false).onChange(function(){
		if (guiOptions["Show Real Boats"])
			boatsSelected.flags.visible = true;
		else
			boatsSelected.flags.visible = false;
	});

	// Graphics configuration
	var guiGraphics = guiBSimulation.addFolder("Graphics");
		guiGraphics.add(guiOptions, "Extra vertices", 1 , 30).step(1);
		guiGraphics.add(guiOptions, "Vertex Skip", 0 , 10).step(1);
		guiGraphics.add(guiOptions, "Alpha Boat Lines", 0, 1);		



// Weather
var guiWeather = gui.addFolder("Weather");
	guiWeather.add(guiOptions, 'Show Winds', true, false).onChange(function(){
		wind.flags.visible = guiOptions["Show Winds"];
	});
	guiWeather.add(guiOptions, 'Hide Clouds', true, false).onChange(function(){
		clouds.flags.visible = !guiOptions["Hide Clouds"];
	});









// THREAD / WORKER
//var timeOfCalc = scene.time;
var bwrdata = {};
bwrdata.ready = false;
bwrdata.start_time = 0;
bwrdata.end_time = 0;
bwrdata.meshReady = true;
bwrdata.parsedBoats = 0;

var myWorker;
if (!!window.Worker){
	myWorker = new Worker("scripts/worker.js");
	myWorker.onmessage = function (e){

		// Init boat data variables
		if (e.data["function"] == "initVars"){
			bwrdata.ready = e.data["ready"];
			bwrdata.start_time = e.data["start_time"];
			bwrdata.end_time = e.data["end_time"];
			bwrdata.parsedBoats = e.data["parsedBoats"];
			guiBoats.close();
			guiBSimulation.open();
			boatsSelected.flags.visible = guiOptions["Show Real Boats"];

			myWorker.postMessage({
				"function": "selectBoats",
				"boatsSelected": "0,1,2,3,4,5,8"
			});
		} 
		// Loading...
		else if (e.data["function"] == "loadProgress"){
			guiOptions["Loading..."] = e.data["load"];
		} 
		// Parsing...
		else if (e.data["function"] == "onboat"){
			guiOptions["Processing..."] = e.data["progress"];
			boatsSelected.flags.visible = true;
		} 
		// Update boatsPos, boatLines  or boatsSelected meshes
		else if (e.data["mesh"]){
			if (!e.data["samples"]){
			 	bwrdata.meshReady = true;
			 	return;
			}

			var mesh_name = "mesh_"+e.data["mesh"];
			var tmpSamples = e.data["samples"];

			if (!renderer.meshes[mesh_name])
				renderer.meshes[mesh_name] = GL.Mesh.load({vertices:tmpSamples});
			else if (renderer.meshes[mesh_name].getBuffer("vertices").data.length != tmpSamples.length)
				renderer.meshes[mesh_name] = GL.Mesh.load({vertices:tmpSamples});
			else{
				var buffer = renderer.meshes[mesh_name].getBuffer("vertices");
				buffer.data.set(tmpSamples);
				buffer.upload(gl.STREAM_DRAW);
			}

			bwrdata.meshReady = true;
			//meter.tick();
		}
	}
} else
	console.log("Error, no window.Worker: " + window.Worker);


// Start loading the boats once the application starts
if (myWorker){


	guiOptions["Load Data State"] = false;

	guiOptions["Restart Simulation"]();
	bwrdata.ready = false;
	bwrdata.start_time = 0;
	bwrdata.end_time = 0;

	myWorker.postMessage({
		"function": "load", 
		"num_boats": 1000,
		"max_boats": 17000, 
		"file_url": document.URL + "foo.zip"
	});

}







var tt = 0;


// DRAW
gl.ondraw = function()
{
	// fxTexture.drawTo(function(){
	// 	gl.clearColor(0.1,0.1,0.1,1);
	// 	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

	// 	renderer.render(scene, camera);

	// 	drawFlares();
	// });	

	// fxTexture.toViewport(renderer.shaders["fx"]);

	stats.begin();

	// Previsualization: Render to Texure
	if (!bwrdata.ready && renderer.meshes["mesh_boatsSelected"]){

		// renderer.textures["boatsPath"].drawTo(function(){

		// 	gl.enable(gl.BLEND);
		// 	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
		// 	gl.depthMask(false);

		// 	renderer.shaders["boatsPath"].uniforms({
		// 	  	u_color: [1, 1, 1, 1.0 / Math.pow(Math.log10(guiOptions["Boats to render"] - bwrdata.parsedBoats),2)]
		// 	}).draw(renderer.meshes["mesh_boatsSelected"], gl.LINE_STRIP);

		// 	gl.disable(gl.BLEND);
		// 	gl.depthMask(true);

		// });
		boatsPath.brightness = (Math.sin(DEG2RAD * tt) + 1.0) * 0.5 * 0.2 + 0.8;
		tt += 4;
		boatsPath._uniforms = {u_brightness: boatsPath.brightness};
		
	} else if (boatsPath.brightness > 0.79){
			boatsPath.brightness-= 0.001;
			boatsPath._uniforms = {u_brightness: boatsPath.brightness};
	}

	

	gl.clearColor(0.0,0.0,0.0,1);
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

	renderer.render(scene, camera);

	drawFlares();

	
	stats.end();
	
};




//update loop
gl.onupdate = function(dt)
{

	// Rotation
	if (guiOptions["Rotate space"]){
		if (guiOptions["Rotation speed"] > 0 ){
			ii -= 0.1 * guiOptions["Rotation speed"];
			skybox.rotate(-0.045 * guiOptions["Rotation speed"] * DEG2RAD, [0,1,0], true);
			vec3.polarToCartesian(lightPos, [0.4*80, DEG2RAD * -17 , DEG2RAD * ii]);
			vec3.normalize(lightDir, lightPos);
			mySun.position = lightPos;
			ii = ii < -180 ? -ii : ii;
		}
	} else if (guiOptions["Rotation speed"] > 0 ) {
		earth.rotate(-0.1 * guiOptions["Rotation speed"] * DEG2RAD, [0,1,0], true);
	}
	

	clouds.rotate(dt*0.01, [0,1,0], true);


	if (wind.flags.visible){
		wind.it += 0.1;
		wind._uniforms = {u_alpha: wind.it};
	}
	

	// Load boats
	if (guiOptions["Load Data State"] && bwrdata.ready){
		guiOptions["Load Data State"] = false;

		guiOptions["Restart Simulation"]();
		bwrdata.ready = false;
		bwrdata.start_time = 0;
		bwrdata.end_time = 0;
		boatsSelected.flags.visible = false; // avoids a little flash before loading. This is set to true when loading
		
		myWorker.postMessage({
			"function": "loadBoats",
			"num_boats": guiOptions["Boats to render"]
		});

	}


	// Update mesh
	if (bwrdata.ready && bwrdata.meshReady){// && prevProgress != guiOptions["Simulation Progress"]){

		prevProgress = guiOptions["Simulation Progress"];
		guiOptions["Simulation Progress"] = scene.time / ((bwrdata.end_time - bwrdata.start_time) * 0.0001);

		if (prevProgress != guiOptions["Simulation Progress"]){
		//if (guiOptions["Hide Clouds"]){
			myWorker.postMessage({
				"function": "updateMesh",
				"progress": guiOptions["Simulation Progress"],
				"prevProgress": prevProgress,
				"extraVertices": guiOptions["Extra vertices"],
				"vertexSkip": guiOptions["Vertex Skip"]
			});

			bwrdata.meshReady = false;
		//}
		}
		
		


	}
	// TODO:
	// Downloading the data can be annoying.
	// Divide files in subsets (by dates), data should be downloaded and processed on the go.
	// If user wants to display selected boats, it is better to divide subsets by packs of boats, not dates.
	// load Data can be stopped? destroy worker, but lose downloaded info. Can we store downloaded info?
	
	// High, low options?
	// camera distance - intensity lines?

	// mozilla, safari version?


	// Camera distance effects
	// Boat Lines and Boats Selected
	var dist = vec3.length(camPos); // 1 to 3
	dist -= 3.2;
	dist *= -0.5;
	dist = dist < 0.4 ? dist = 0.4 : dist = dist;

	// Previsualization of the boats and uniforms updates
	if (bwrdata.ready){
		boatsSelected._uniforms = {u_color: [1.0, 0.2, 0.2, 1.0], u_minA: 0.8*dist* dist, u_ttime: scene.time};

		var trailSize = 10.0 / (guiOptions["Extra vertices"] * (guiOptions["Vertex Skip"] + 1));
		boatLines._uniforms = {u_color: [1, 1, 1, dist * dist * 1.0 * guiOptions["Alpha Boat Lines"]], u_trailLength: trailSize};
	} else { // Previsualization of boats while loading
		var value = (1.0 - guiOptions["Processing..."]) * 0.6 + 0.2;
		boatsSelected._uniforms = {u_color: [1.0, value, value, 0.7], u_ttime: 200.0, u_minA: 1.0};
	}
	




	// Scene time
	// Stops increasing when the last recorded time is reached
	if (scene.time + dt * guiOptions ["Simulation Speed"] < (bwrdata.end_time - bwrdata.start_time) * 0.0001){
		if (dt > 0.2){
			dt = 0.2;
		}
		scene.update(dt * guiOptions["Simulation Speed"]);
	}

	

	// Rotates the sun around the earth
	if (guiOptions["Real Sun Position"]){
		var date = new Date((bwrdata.start_time + scene.time * 10000) * 1000);
		ii = (date.getHours() + date.getMinutes() / 60.0 ) * -15 + 87; 
		vec3.polarToCartesian(lightPos, [0.4*80, DEG2RAD * -17 , DEG2RAD * ii]);
		vec3.normalize(lightDir, lightPos);
		mySun.position = lightPos;
	}
	

};

window.onresize = function (e){
	context.canvas.width = window.innerWidth;
	context.canvas.height = window.innerHeight;

	camera.aspect =  gl.canvas.width / gl.canvas.height;

	gl.viewport(0,0,context.canvas.width,context.canvas.height);

	//fxTexture = new Texture(gl.canvas.width, gl.canvas.height);

};