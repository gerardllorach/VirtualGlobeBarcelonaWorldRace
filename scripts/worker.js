importScripts("BWRData.js")
importScripts('js/jszip.min.js');


var workData = new BWRData();

// Vertices of mesh_boatLines
var samplesArray2;
var lastIndices;
// Vertices of mesh_boatsSelected
var sammplesArray3;
var newSelected = false;



onmessage = function(e) {
  //console.log(e.data);

	if (e.data["function"] == "load"){
		// TODO: if new max_boats is smaller, do not reload? but maybe file has changed or filename
		workData.prevData = [];
		workData.boats = [];
		workData.boatsRender = e.data["num_boats"];
		workData.max_boats = e.data["max_boats"];
		workData.load(e.data["file_url"], OnBoatsLoaded, function(progress){ postMessage({"function": "loadProgress", "load": progress});});
	} else if(e.data["function"] == "loadBoats"){
		workData.boatsRender = e.data["num_boats"];
		// Limit values
		if (workData.boatsRender > workData.max_boats)
			workData.boatsRender = workData.max_boats;
		// Parse if necessary
		if (workData.boatsRender > workData.boats.length){
			workData.parse(workData.ddata);
			// Update last indices array for performance
			var tmpArray = lastIndices;
			lastIndices = new Int32Array(workData.boats.length);
			lastIndices.set(tmpArray, 0);
		}  else
			lastIndices = new Int32Array(workData.boats.length);
		
		postMessage({"function": "initVars", "ready": workData.ready, "start_time": workData.start_time, "end_time": workData.end_time, "parsedBoats": workData.boats.length});

	} else if(e.data["function"] == "updateMesh"){
		workData.updateMesh(e.data["progress"], e.data["prevProgress"], e.data["extraVertices"], e.data["vertexSkip"]);
	} else if (e.data["function"] == "restart"){
		lastIndices = new Int32Array(workData.boats.length);
		samplesArray2 = undefined;
	} else if (e.data["function"] == "selectBoats"){
		
		var boatsSelected = e.data["boatsSelected"].split(",");
		workData.boatsSelected = boatsSelected;

		workData.numSamplesSelected = 0;
		for (var i = 0; i < workData.boatsSelected.length; i++){
			var index = parseInt(workData.boatsSelected[i]);
			if (index > workData.boatsRender){
				console.log("Selected boat has not been loaded: ", index); // TODO: Or out of bounds. Load new data if not
				index = workData.boatsRender-1;
			}
			workData.numSamplesSelected += workData.boats[index].numsamples;

		}
		// Send the full mesh only once with [x, y , t, ...]. Trail done by shader. More work for the rendering side, but releasing the worker from updates
		samplesArray3 = new Float32Array((workData.numSamplesSelected + workData.boatsSelected.length * 2) * 3);
		var samplesIndex3 = 0;

		for (var i = 0; i < workData.boatsSelected.length; i++){
			var selIndex = workData.boatsSelected[i];
			var boat = workData.boats[selIndex];

			// Add initial blank vertex
			samplesArray3.set([boat.samples[0], boat.samples[1], 0], samplesIndex3);
			samplesIndex3 += 3;

			samplesArray3.set(boat.samples, samplesIndex3);
			samplesIndex3 += boat.numsamples * 3;

			// Add final blank vertex
			samplesArray3.set([boat.samples[(boat.numsamples-1)*3], boat.samples[(boat.numsamples-1)*3 + 1], 0], samplesIndex3);
			samplesIndex3 += 3;
		}
		postMessage({"mesh": "boatsSelected", "samples": samplesArray3});

	}

}


workData.onboat = function (boat_info, parsedProgress){

	var packSize = Math.min(Math.ceil(workData.boatsRender / 100), 50);
	if (workData.boats.length % packSize == 0){

		postMessage({"function": "onboat", "progress": parsedProgress});

		// Previsualize data
		postMessage({"mesh": "boatsSelected", "samples": boat_info.samples});
	}
	
}

function OnBoatsLoaded(){

	lastIndices = new Int32Array(workData.boats.length);

	postMessage({"function": "initVars", "ready": workData.ready, "start_time": workData.start_time, "end_time": workData.end_time, "parsedBoats": workData.boats.length});
}



// Include here the creation of the mesh of the boat lines?
workData.updateMesh = function (progress, prevProgress, extraVertices, vertexSkip){ 


	// to get the old point we can access the mesh from renderer or recalculate the point. Seems much optimal to access the mesh. Although, take care when it is undefined or empty.
	var extraSamples = Math.floor(extraVertices);


	// For mesh_boatLines
	// An improvement could be made here: if boatsRender is smaller than boats.length, reuse the same mesh and send an index for createBuffers..
	// This improvement is not too significant to implement because we are resizing the mesh only when loading a different number boats or changing extraverticess.
	if (samplesArray2){
		if (samplesArray2.length != workData.boatsRender * 3 * (extraSamples*2)){
			samplesArray2 = new Float32Array( workData.boatsRender * 3 * (extraSamples*2));
		}
	} else {
		samplesArray2 = new Float32Array( workData.boatsRender * 3 * (extraSamples*2));
	}

	 

	var samplesIndex2 = 0;
	var position = new Float32Array(3);

	var boat;



	// update mesh



		for (var i = 0; i< workData.boatsRender; i++){


			// Update Boat Lines
			// Use Z for alpha calculation in shader to avoid flashes
			position = workData.getExactPosition(position, i, progress);
			samplesArray2.set([position[0], position[1],  0.0 ], samplesIndex2);
			samplesIndex2 += 3;
			// Check if there is the new index is different from the previous one. It is checked inside the for loop
			boat = this.boats[i];

			// fill samplesArray2
			for (var j = 0; j<extraSamples; j++){


				// position[2] is the previous index of calculated sample
				// Forces to skip the same vertices always. Corners are fixed this way
				position[2] = position[2] - position[2]%(vertexSkip+1);
				var index = position[2]-j*(vertexSkip+1);

				if (index < 0){
					index = 0;
				}


				var lat = boat.samples[index * 3];
				var llong = boat.samples[index * 3 + 1];
				// Use Z for alpha calculation in shader to avoid flashes
				var time = progress * (workData.end_time - workData.start_time) - boat.samples[index * 3 + 2];//boat.samples[index * 3 + 2];

				// Exit if vertices are the same as before. Only check in the first iteration
				if (j == 0){
					if (time == samplesArray2[index*3 + 2])
						j = extraSamples;
				}


				samplesArray2.set([lat, llong, time], samplesIndex2);
				samplesIndex2 += 3;

				if (j != extraSamples-1){
					// Duplicate vertex for gl.LINES
					samplesArray2.set([lat, llong, time], samplesIndex2);
					samplesIndex2 += 3;

				}


			}
		}

	

			
	// How to load the mesh falls on the main thread
	postMessage({"mesh": "boatLines", "samples": samplesArray2});

}


workData.getExactPosition = function(out, boatNum, progress){

	if (boatNum > this.max_boats){
		console.log("Boat requested is out of bounds: ", boatNum);
		boatNum = this.max_boats;
	}

	var boat = this.boats[boatNum];

	
	//out = workData.findSample(boat.numsamples, boat.samples, progress, Math.floor(progress * boat.numsamples), 0, 0, boatNum);
	out = workData.findSample(boat.numsamples, boat.samples, progress, lastIndices[boatNum], 0, 0, boatNum);

	

	if (lastIndices[boatNum] == 0)
		lastIndices[boatNum] = Math.floor(progress * boat.numsamples);
	else
		lastIndices[boatNum] = out[2];

	return out;

}



workData.findSample = function (numSamples, samples, progress, i, index, jj, boatNum){
	jj++;
	index = index + i;
	i = Math.abs(i);
	var ni;

	if (index < 0 || progress < 0){
		return [samples[0] , samples[1], 0];
	}
	if (index > numSamples-2)
		return [samples[(numSamples-1)*3], samples[(numSamples-1)*3+1], numSamples-1];


	var sampleProgress = samples[index*3 + 2] / (workData.end_time - workData.start_time);
	var nextSampleProgress = samples[(index + 1)*3 + 2] / (workData.end_time - workData.start_time);



	if ((sampleProgress <= progress && nextSampleProgress >= progress) || jj > 30){
		var factor = 1;
		if (nextSampleProgress != sampleProgress && progress != sampleProgress)
			factor = (progress-sampleProgress) / (nextSampleProgress - sampleProgress);

		if (jj > 30){
			factor = 0;
			lastIndices[boatNum] = Math.floor(progress * numsamples);
			console.log("findSample has done more than 30 iterations");
		}



		var lat = samples[index*3] * (1- factor) + samples[(index+1)*3] * factor;
		var llong = samples[index*3 + 1] * (1- factor) + samples[(index+1)*3 + 1] * factor;

		if(isNaN(lat)) console.log("error lat", numSamples, index, factor, nextSampleProgress, sampleProgress, progress, lastIndices);
		//if(isNaN(llong)) console.log("error long");

		if (factor > 1){
			console.log(numSamples, index, jj, boatNum, factor, nextSampleProgress, sampleProgress,progress);
		}


		return [lat, llong, index];


	} else if (sampleProgress < progress && nextSampleProgress <= progress){
		ni = Math.floor((numSamples - index)/2);
		if (ni < i)
			i = ni;
		else
			i = Math.floor(i/2);

		if (i == 0)
			i = 1;
	}
	else{
		ni = Math.floor(index/2);
		if (ni < i)
			i = -ni;
		else
			i = -Math.floor(i/2);

		if (i == 0)
			i = -1;	
	}

	

	return workData.findSample (numSamples, samples, progress, i, index, jj, boatNum);
}