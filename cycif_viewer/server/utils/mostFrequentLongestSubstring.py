from itertools import combinations
from difflib import SequenceMatcher


def find_substring(header_list):
    substring_frequencies = {}
    for combo in combinations(header_list, 2):
        substring = longest_substring(combo[0], combo[1])
        if substring in substring_frequencies:
            substring_frequencies[substring] += 1
        else:
            substring_frequencies[substring] = 1
    # return the most frequent substring between evey combination of strings
    return max(substring_frequencies, key=substring_frequencies.get)


# via geeksforgeeks
def longest_substring(str1, str2):
    # initialize SequenceMatcher object with
    # input string
    seqMatch = SequenceMatcher(None, str1, str2)

    # find match of longest sub-string
    # output will be like Match(a=0, b=0, size=5)
    match = seqMatch.find_longest_match(0, len(str1), 0, len(str2))

    # print longest substring
    if (match.size != 0):
        return (str1[match.a: match.a + match.size])
    else:
        return ''
