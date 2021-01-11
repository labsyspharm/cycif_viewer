from sklearn.cluster import KMeans
import numpy as np
import matplotlib.pyplot as plt
from sklearn.cluster import DBSCAN

fig, axs = plt.subplots(1, 1, figsize=(10, 10))
i = 0
for metric in ['cosine']:
    for n_neighbors in [200]:
        for min_dist in [.2]:
            save_string = 'full_weighted_umap_' + metric + '_' + str(n_neighbors) + 'neighbors_' + str(
                min_dist) + 'dist'
            save_string = save_string.replace('.', '')
            A = np.load(save_string + '.npy')
            y_kmeans = DBSCAN(eps=0.3, min_samples=2, algorithm='ball_tree', metric='haversine').fit_predict(A)
            axs.scatter(A[:, 0], A[:, 1], c=y_kmeans, s=0.1, alpha=0.1, cmap='viridis')
            axs.set_title(save_string + "_DBSCAN")
            i += 1
            plt.savefig('DBSCAN.png')
            plt.show()
