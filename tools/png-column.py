# CONTEXT: sibling of png-band.py — that one answers "how much swing", this one hands back the pixels
import struct, zlib, sys, json

path, x_at, y0, y1 = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
data = open(path, "rb").read()
pos, idat = 8, b""
while pos < len(data):
	length = struct.unpack(">I", data[pos:pos + 4])[0]
	kind = data[pos + 4:pos + 8]
	body = data[pos + 8:pos + 8 + length]
	if kind == b"IHDR":
		width, height, depth, colour = *struct.unpack(">II", body[:8]), body[8], body[9]
	if kind == b"IDAT":
		idat += body
	pos += 12 + length

channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[colour]
assert depth == 8, f"expected 8 bits per channel, got {depth}"
stride = width * channels
raw = zlib.decompress(idat)
assert len(raw) == height * (stride + 1), f"{len(raw)} bytes for {height} rows of {stride}"

prev = bytearray(stride)
out = []
for y in range(min(y1, height)):
	kind = raw[y * (stride + 1)]
	line = bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
	for x in range(stride):
		a = line[x - channels] if x >= channels else 0
		b = prev[x]
		c = prev[x - channels] if x >= channels else 0
		if kind == 1: line[x] = (line[x] + a) & 255
		elif kind == 2: line[x] = (line[x] + b) & 255
		elif kind == 3: line[x] = (line[x] + (a + b) // 2) & 255
		elif kind == 4:
			p = a + b - c
			pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
			line[x] = (line[x] + (a if (pa <= pb and pa <= pc) else (b if pb <= pc else c))) & 255
	prev = line
	if y >= y0:
		at = x_at * channels
		out.append(round(0.2126 * line[at] + 0.7152 * line[at + 1] + 0.0722 * line[at + 2], 2))

print(json.dumps(out))
