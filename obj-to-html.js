const [ _, __, filename ] = process.argv;
const fs = require('fs');
const matrix = require('css-matrix3d');

const obj = fs.readFileSync(filename, 'utf8');

let objects = {};
let currentObject = '';

for (let line of obj.split('\n')) {
	let args = line.split(' ');
	const command = args[0];

	switch (command) {
		case 'o':
			currentObject = args[1];
			break;
		case 'v':
			objects[currentObject] = (objects[currentObject] || {});
			objects[currentObject].vertices = (objects[currentObject].vertices || []);
			objects[currentObject].vertices.push([args[1], args[2], args[3]]);
			break;
		case 'vn':
			objects[currentObject] = (objects[currentObject] || {});
			objects[currentObject].normals = (objects[currentObject].normals || []);
			objects[currentObject].normals.push([args[1], args[2], args[3]]);
			break;
		case 'f':
			objects[currentObject] = (objects[currentObject] || {});
			objects[currentObject].faces = (objects[currentObject].faces || []);
			objects[currentObject].faces.push(args.slice(1).map(l => l.split('/')).map(q => ({
				vertex: q[0],
				texture: q[1],
				normal: q[2]
			})));
			break;
	}
}

const dot = (a, b) => a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);
const cross = (a, b) => {
	return [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0]
	]
}

const o = objects[Object.keys(objects)[0]];

function rotateAlign(v1, v2) {
	if (v1[1] === -v2[1]) return matrix.rotate('x', 0);
	const axis = cross(v1, v2);

	const cosA = dot(v1, v2);
	const k = 1 / (1 + cosA);

	return [
		(axis[0] * axis[0] * k) + cosA,    (axis[1] * axis[0] * k) - axis[2], (axis[2] * axis[0] * k) + axis[1], 0,
		(axis[0] * axis[1] * k) + axis[2], (axis[1] * axis[1] * k) + cosA,    (axis[2] * axis[1] * k) - axis[0], 0,
		(axis[0] * axis[2] * k) - axis[1], (axis[1] * axis[2] * k) + axis[0], (axis[2] * axis[2] * k) + cosA,    0,
		0,                                 0,                                 0,                                 1
	];
}

for (let face of o.faces) {
	const positions = face.map(l => o.vertices[Number(l.vertex) - 1].map(n => Number(n)));
	const normals = face.map(l => o.normals[Number(l.normal) - 1].map(n => Number(n)));
	const avgPos = positions.reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 0, 0]).map(l => l/positions.length);
	const avgNormal = normals.reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 0, 0]).map(l => l/normals.length);

	const rot = rotateAlign([0, 1, 0], avgNormal);

	const shade = Math.max(0, dot(avgNormal, [Math.sin(Math.PI * 1.7), Math.cos(Math.PI * 1.7), 0]));
	const hex = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'f'][Math.floor(shade * 16)].repeat(3);
	
	const css = matrix.generateCSS(
		matrix.scale(40, 40),
		matrix.rotate('x', 30),
		matrix.translate(avgPos[0], avgPos[1], avgPos[2]),
		matrix.rotate('x', rot[0]/(Math.PI*2) * 360),
		matrix.rotate('y', rot[1]/(Math.PI*2) * 360),
		matrix.rotate('z', rot[2]/(Math.PI*2) * 360),
		matrix.scale(0.4, 0.4)
	);
	console.log(`<div style="z-index:${Math.floor(-avgPos[2] * 256 + 256)};background-color:#${hex};position:absolute;width:1px;height:1px;transform:perspective(50px) ${css}"></div>`);
}
