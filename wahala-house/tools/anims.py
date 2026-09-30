#!/usr/bin/env python3
"""Pack single-clip rig GLBs into one compact animation library (JSON).

usage: anims.py out.json key=clip.glb [key=clip.glb ...]

For every clip we keep the source rig's rest pose (TRS per node up to the root),
rotation keys for every bone and the Hips translation. The browser rebuilds a
tiny skeleton from the rest pose and retargets the clip onto each character.
"""
import json, struct, sys

FPS = 24

def read_glb(path):
    d = open(path, "rb").read()
    jl = struct.unpack("<I", d[12:16])[0]
    j = json.loads(d[20:20 + jl])
    off = 20 + jl
    bl = struct.unpack("<I", d[off:off + 4])[0]
    b = d[off + 8: off + 8 + bl]
    return j, b

NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}

def acc(j, b, i):
    a = j["accessors"][i]
    bv = j["bufferViews"][a["bufferView"]]
    n = NCOMP[a["type"]]
    start = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = bv.get("byteStride", 4 * n)
    assert a["componentType"] == 5126, "float accessors only"
    out = []
    for k in range(a["count"]):
        o = start + k * stride
        out.append(struct.unpack_from("<%df" % n, b, o))
    return out

def sample(times, vals, t, slerp):
    if t <= times[0]: return vals[0]
    if t >= times[-1]: return vals[-1]
    lo, hi = 0, len(times) - 1
    while hi - lo > 1:
        m = (lo + hi) // 2
        if times[m] <= t: lo = m
        else: hi = m
    f = (t - times[lo]) / (times[hi] - times[lo] or 1)
    a, c = vals[lo], vals[hi]
    if slerp:
        dot = sum(x * y for x, y in zip(a, c))
        if dot < 0: c = tuple(-x for x in c)
        v = [x + (y - x) * f for x, y in zip(a, c)]
        n = sum(x * x for x in v) ** 0.5 or 1
        return tuple(x / n for x in v)
    return tuple(x + (y - x) * f for x, y in zip(a, c))

def main():
    out = sys.argv[1]
    lib = {"fps": FPS, "clips": {}}
    for arg in sys.argv[2:]:
        key, path = arg.split("=", 1)
        j, b = read_glb(path)
        nodes = j["nodes"]
        parent = {}
        for i, n in enumerate(nodes):
            for c in n.get("children", []): parent[c] = i
        names = [n.get("name", "n%d" % i) for i, n in enumerate(nodes)]
        hips = names.index("Hips")
        # Rest pose for Hips, its ancestors and every bone below it.
        keep = set()
        stack = [hips]
        while stack:
            k = stack.pop(); keep.add(k); stack.extend(nodes[k].get("children", []))
        p = parent.get(hips)
        while p is not None: keep.add(p); p = parent.get(p)
        # parents before children
        def depth(i):
            d = 0
            while i in parent: i = parent[i]; d += 1
            return d
        order = sorted(keep, key=depth)
        idx = {n: k for k, n in enumerate(order)}
        rest = []
        for n in order:
            nd = nodes[n]
            rest.append({"n": names[n], "p": idx.get(parent.get(n), -1) if parent.get(n) in keep else -1,
                         "t": [round(x, 5) for x in nd.get("translation", [0, 0, 0])],
                         "r": [round(x, 6) for x in nd.get("rotation", [0, 0, 0, 1])],
                         "s": [round(x, 6) for x in nd.get("scale", [1, 1, 1])]})
        anim = j["animations"][0]
        tracks = {}
        dur = 0
        for ch in anim["channels"]:
            tgt = ch["target"]
            node = tgt.get("node")
            if node not in keep: continue
            path_ = tgt["path"]
            if path_ == "scale" and names[node] != "Hips": continue
            if path_ == "translation" and names[node] != "Hips": continue
            s = anim["samplers"][ch["sampler"]]
            times = [t[0] for t in acc(j, b, s["input"])]
            vals = acc(j, b, s["output"])
            dur = max(dur, times[-1])
            tracks[(names[node], path_)] = (times, vals)
        n = max(2, int(round(dur * FPS)) + 1)
        out_tracks = []
        # Root scale bug: some library clips bake a scale into Hips. Fold it out.
        hs = tracks.pop(("Hips", "scale"), None)
        for (nm, path_), (times, vals) in tracks.items():
            seq = []
            for i in range(n):
                t = min(dur, i / FPS)
                v = sample(times, vals, t, path_ == "rotation")
                if path_ == "translation" and hs:
                    sv = sample(hs[0], hs[1], t, False)[1] or 1
                    v = tuple(x / sv for x in v)
                seq.extend(round(x, 4) for x in v)
            out_tracks.append({"n": nm, "p": "q" if path_ == "rotation" else "t", "v": seq})
        lib["clips"][key] = {"dur": round(dur, 4), "n": n, "rest": rest, "tracks": out_tracks}
        print(key, "dur", round(dur, 2), "frames", n, "tracks", len(out_tracks), "hipScale", bool(hs))
    open(out, "w").write(json.dumps(lib, separators=(",", ":")))

main()
