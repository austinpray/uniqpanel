import random
import uuid

NUM_FILES = 4
NUM_STRINGS = 1000 * 1000 * 100
NUM_UNIQUE = 10 * 1000
SEED = 123


def gen_corpus(N, seed):
    rnd = random.Random()
    # rnd.seed(seed)

    corpus = []
    while len(set(corpus)) != NUM_UNIQUE:
        # just in case of collisions
        corpus = [
            "%s\n" % str(uuid.UUID(int=rnd.getrandbits(128), version=4))
            for _ in range(int(NUM_UNIQUE))
        ]

    return corpus


if __name__ == "__main__":
    print(
        "Generating {} files with a total of {}M strings ({}K unique)".format(
            NUM_FILES, NUM_STRINGS / 1e6, NUM_UNIQUE / 1e3
        )
    )

    corpus = gen_corpus(NUM_UNIQUE, SEED)

    per_file, remainder = divmod(NUM_STRINGS, NUM_FILES)
    for i in range(1, NUM_FILES + 1):
        with open("giant_test_rand_%d.txt" % i, "w") as f:
            f.writelines(corpus[i % len(corpus)] for i in range(per_file))

    if remainder:
        with open("giant_test_rand_1.txt", "a") as f:
            f.write("\n")
            f.writelines(corpus[i % len(corpus)] for i in range(remainder))
