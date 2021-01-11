from sklearn.neighbors import BallTree
from tqdm import tqdm
import numpy as np
import umap
import time
import os

metric = 'cosine'
A = np.load('..//data/neighborhood_array_complex.npy')
A = A.astype(np.float32, copy=False)
for n_neighbors in [10, 100, 200]:
    for min_dist in [.2, .8]:
        start_time = time.time()
        save_string = 'full_hybrid_umap_' + metric + '_' + str(n_neighbors) + 'neighbors_' + str(min_dist) + 'dist'
        save_string = save_string.replace('.', '')
        print(save_string)
        if (os.path.isfile(save_string + '.npy')):
            print("skipping")
        else:
            mapping = umap.UMAP(metric=metric, n_neighbors=n_neighbors, min_dist=min_dist, low_memory=True,
                                random_state=42).fit(A)
            print("Mapped", save_string, "Time:", time.time() - start_time)
            new_data_embedding = mapping.transform(A)
            np.save(save_string, new_data_embedding)
        print("--- %s seconds ---" % (time.time() - start_time))
