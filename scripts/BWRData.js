function BWRData() {
	this.normalize_time = true;
	this.ready = false;
	this.boats = [];
	this.max_boats = 1000;
	this.start_time = 0;
	this.end_time = 0;
	this.totalSamples = 0;
	this.info_pos = 0;
	this.last_pos = 0;
}

BWRData.prototype.load = function (url, on_complete, on_progress) {
	var that = this;
	var xhr = new XMLHttpRequest();

	xhr.open('GET', url, true);
	xhr.responseType = "arraybuffer";


	xhr.onload = function () {
		var response = this.response;
		if (this.status < 200 || this.status >= 300)
			return console.error("File not found: ", this.status);

		// Unzip file
		// Use JSZip to extract the .zip file
		var jszip = new JSZip();

		jszip.loadAsync(response).then(zip => {
			// Assume there is only one file inside the zip
			var fileNames = Object.keys(zip.files);
			if (fileNames.length === 0) {
				return console.error("No files found in the zip");
			}
			// Get the first file and read its content as binary (arraybuffer)
			return zip.files[fileNames[0]].async("arraybuffer");
		}).then(fileContent => {
			that.parse(fileContent);
			if (on_complete)
				on_complete();
			return;
		})
	}

	if (on_progress)
		xhr.addEventListener("progress", function (e) {
			var progress = e.loaded / e.total;
			on_progress(progress);
		}, false);

	xhr.send();
	return xhr;
}

//returns true is no more data is needed
BWRData.prototype.parse = function (data) {
	this.ddata = data;

	var data_array = new Uint8Array(data);
	var pos = 0;
	var first_boat = 0;
	var num_boats = 0;
	var start_time = 0;



	if (this.boats.length - 1 > 0) {
		first_boat = this.boats.length - 1;
	}

	//this is in case we are parsing a file in chunks
	if (this.prev_data) {
		//merge all unused data with the new data
		var merged_data_array = new Uint8Array(this.prev_data.length + data_array.length);
		merged_data_array.set(this.prev_data, 0);
		merged_data_array.set(data_array, this.prev_data.length - 1);
		data_array = merged_data_array;

		first_boat = this.last_boat_index;
		num_boats = this.num_boats;
		start_time = this.start_time;
		this.prev_data = null;
	}
	else {
		var fourcc = data_array.subarray(0, 4);
		var header = BWRData.Uint8ArrayToString(fourcc);
		console.log("HEADER:", header);

		if (header != "HISU")
			throw ("Binary file not from BWR");

		//num boats
		num_boats = this.num_boats = BWRData.readInt32(data_array, 4) - 1;
		console.log("BOATS:", num_boats);

		//start_time in epoch
		start_time = this.start_time = BWRData.readUint32(data_array, 8);
		var date = new Date(this.start_time * 1000);
		console.log("TIME:", date.toString());
		pos = 16; //skip 4 zeros
	}

	//read boats
	var parsed_boats = 0;
	if (this.max_boats > num_boats)
		this.max_boats = num_boats;


	for (var i = first_boat; i < this.boatsRender && i < this.max_boats; i++) {
		if (info_pos + 12 > data_array.length) {
			this.prev_data = data_array.subarray(pos, data_array.length);
			this.last_boat_index = i;
			console.warn("File is incomplete, cut on header");
			break;
		}

		//id
		var boat_id = BWRData.readUint32(data_array, pos);
		//console.log(boat_id);

		//num samples
		var samples = BWRData.readUint32(data_array, pos + 4);

		//first time
		var first_time = BWRData.readUint32(data_array, pos + 8);

		pos += 12;

		var info_pos = pos;
		var samplesize = 8;

		if (info_pos + samples * samplesize > data_array.length) {
			this.prev_data = data_array.subarray(pos - 12, data_array.length);
			this.last_boat_index = i;
			console.warn("File is incomplete, last boat found: " + boat_id);
			break;
		}

		var samples_array = new Float32Array(samples * 3);
		var prev_time = first_time;
		for (var j = 0; j < samples; j++) {
			var deltatime = BWRData.readInt32(data_array, pos);
			var ulong = BWRData.readUint16(data_array, pos + 4);
			var ulat = BWRData.readUint16(data_array, pos + 6);
			pos += samplesize;

			var flong = ((ulong / 65535) * 360) - 180;
			var flat = ((ulat / 65535) * 180) - 90;

			prev_time = prev_time + deltatime;
			samples_array[j * 3] = flat;
			samples_array[j * 3 + 1] = flong;
			samples_array[j * 3 + 2] = this.normalize_time ? (prev_time - start_time) : prev_time;
		}

		//Save last time
		if (this.end_time < prev_time)
			this.end_time = prev_time;

		pos = info_pos + samples * samplesize;

		var boat = { id: boat_id, numsamples: samples, samples: samples_array };
		this.boats.push(boat);
		parsed_boats++;


		if (this.onboat)
			this.onboat(boat, parsed_boats / (this.boatsRender - first_boat));

		this.totalSamples += samples;

		//if (parsed_boats % 1000 == 0)
		//	console.log((first_boat + parsed_boats)+" boats parsed of " + this.boatsRender);


	}


	console.log("Boats processed now: " + parsed_boats + ", Total boats processed: ", this.boats.length + ", Num of samples: ", this.totalSamples);

	postMessage({ "mesh": "boatsSelected", "samples": new Float32Array(0) });
	postMessage({ "mesh": "empty" });

	this.ready = true;
	return this.prev_data != null;
}





BWRData.Uint8ArrayToString = function (typed_array, same_size) {
	var r = "";
	for (var i = 0; i < typed_array.length; i++)
		if (typed_array[i] == 0 && !same_size)
			break;
		else
			r += String.fromCharCode(typed_array[i]);
	return r;
}

BWRData.readUint16 = function (buffer, pos) {
	var f = new Uint16Array(1);
	var view = new Uint8Array(f.buffer);
	view.set(buffer.subarray(pos, pos + 2));
	return f[0];
}

BWRData.readInt32 = function (buffer, pos) {
	var f = new Int32Array(1);
	var view = new Uint8Array(f.buffer);
	view.set(buffer.subarray(pos, pos + 4));
	return f[0];
}

BWRData.readUint32 = function (buffer, pos) {
	var f = new Uint32Array(1);
	var view = new Uint8Array(f.buffer);
	view.set(buffer.subarray(pos, pos + 4));
	return f[0];
}

BWRData.readFloat32 = function (buffer, pos) {
	var f = new Float32Array(1);
	var view = new Uint8Array(f.buffer);
	view.set(buffer.subarray(pos, pos + 4));
	return f[0];
}

