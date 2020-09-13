// Geocode zip codes
//   - It uses a dynamic cache so that it only asks for the geocode of a particular zip code once.
//   - In the console output, a "." indicates a cache hit, "+" indicates populating the cache.
//   - Save both a CSV and JSON file

const fs = require('fs');
const fetch = require('node-fetch');
const neatCsv = require('neat-csv');
const ObjectsToCsv = require('objects-to-csv');

// Prepopulated the cache with some zip codes that opendatasoft doesn't have
let cache = {
	84009: [-111.999793, 40.562169],
	84081: [-112.038517, 40.606390],
	84129: [-111.957900, 40.653086],
	84096: [-112.040435, 40.494675],
	84005: [-112.014705, 40.306718],
	84045: [-111.911991, 40.323738]
};
let apiCount = 0;

// Current time
let now = new Date();
console.log("Start: "+now.getHours()+":"+now.getMinutes());

// Read CSV
let fileName = "ut_20200821";
fs.readFile(fileName+'.csv', async (err, data) => {
	if (err) return console.error(err);
	let obj = await neatCsv(data);
	let loans = { loans: [] };
		
	// Iterate loans
	for (let i = 0; i < obj.length; i++) {
		// Check zip code cache first
		if (cache[obj[i].Zip]) {
			process.stdout.write(".");
			obj[i].lat = cache[obj[i].Zip][1];
			obj[i].lon = cache[obj[i].Zip][0];
			loans.loans.push(obj[i]);
		} else {
			apiCount = apiCount + 1;

			let response = await fetch('https://public.opendatasoft.com/api/records/1.0/search/?dataset=us-zip-code-latitude-and-longitude&q='+obj[i].Zip+'&facet=state&facet=timezone&facet=dst');
			let json = await response.json();

			if (json.nhits > 0) {
				cache[obj[i].Zip] = json.records[0].geometry.coordinates;
				process.stdout.write("+");

				obj[i].lat = json.records[0].geometry.coordinates[1];
				obj[i].lon = json.records[0].geometry.coordinates[0];
				loans.loans.push(obj[i]);
			} else process.stdout.write(obj[i].Zip);
		}
	}

	// Save json file
	fs.writeFileSync(fileName+".json", JSON.stringify(loans));

	// Save CSV
	const csv = await new ObjectsToCsv(obj);
	csv.toDisk(fileName+'_latlon.csv');

	// Stats & Time
	console.log("API calls: "+apiCount);
	console.log("Cache hits: "+Object.keys(cache).length);
	console.log("End: "+new Date().getHours()+":"+new Date().getMinutes());
});