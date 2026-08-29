# CONTEXT: Chrome writes RGB or RGBA depending on the frame, so the channel count is read, not assumed
import struct, zlib, sys

path, y_at, x0, x1 = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
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
row = None
for y in range(y_at + 1):
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
	row = line

band = [row[x * channels] for x in range(x0, x1)]
print(max(band) - min(band))
