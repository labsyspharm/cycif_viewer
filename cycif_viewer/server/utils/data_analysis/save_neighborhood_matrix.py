from sklearn.neighbors import BallTree
from tqdm import tqdm
import numpy as np
import pandas as pd


raw_data = pd.read_csv("../data/tonsil_with_phenotype.csv")
data = raw_data[['X_centroid', 'Y_centroid', 'phenotype']].copy()
np.save('raw_data', data.to_numpy())

# phenotypes = {val: idx for idx, val in enumerate(data.phenotype.unique())}
# points = pd.DataFrame({'x': raw_data['X_centroid'], 'y': raw_data['Y_centroid']})
# ball_tree = BallTree(points, metric='euclidean')
# temp = []
# neighborhood_matrix = np.zeros((data.shape[0], len(phenotypes)*2))
# A = data.to_numpy()
# n = []
# d = []
# for i in tqdm(range(A.shape[0])):
#     index, distance = ball_tree.query_radius([[A[i, 0], A[i, 1]]], r=50, return_distance=True)
#     neighbors = list(index[0])
#     distances = list(distance[0])
#     for k in range(len(neighbors)):
#         neighbor = neighbors[k]
#         distance = distances[k]
#         neighbor_phenotype = A[neighbor,2]
#         neighbor_phenotype_index = phenotypes[neighbor_phenotype]*2
#         weight = 1
#         if distance > 25:
#             weight = 1 - (distance - 25) / 25
#         neighborhood_matrix[i, neighbor_phenotype_index+1] += weight
#         neighborhood_matrix[i,neighbor_phenotype_index] += 1

# np.save('..//data/neighborhood_array_complex.npy', neighborhood_matrix)

