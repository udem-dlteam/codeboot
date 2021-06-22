string_sample = "The   quick\tbrown\n  \nfox     jumps over the lazy dog   ! "

seps = [None, " ", "!", "o", "\n", "  ", "brown"]
maxsplits = [-2, -1, 0, 1, 2, 3, 4, 5]

for s in seps:
    for m in maxsplits:
        print(string_sample.rsplit(s, m))

print(string_sample.rsplit())
print(string_sample.rsplit(maxsplit=3))
