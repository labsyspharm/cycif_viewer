#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Sat Oct 19 22:36:44 2019
@author: Ajit Johnson Nirmal
Local neighbourhood radius calculator
"""
# Required packagess
import pandas as pd
import numpy as np
from sklearn.neighbors import BallTree
from collections import defaultdict

# Pysal objects
import pysal as ps

def local_neighbourhood_diameter (adata, cell_size, diffusion_area,x='X_position',y='Y_position'):
    
    """
    adata - Ann Data object
    cell_size - Approximate diameter/ size of the cells in pixels
    diffusion_area - Approximate diameter (pixels) of defining a neighbourhood. 
    Typically considered as the area where paracrine interaction is plausible (250μm)
    """  
    # Calculate the number of immediate neighbours 
    #https://www.quora.com/How-can-I-work-out-how-many-small-circles-I-can-fit-into-a-big-circle-See-additional-information
    nneigh = (3.14 * np.square(diffusion_area/2)) / (np.square(cell_size/2) * np.sqrt (12))
    #nneigh = (3.14 * np.square(diffusion_area/2)) / (np.sqrt(adata.obs['Area'].astype('float32').median()/3.14) * np.sqrt (12))
    # Dataframe of co-ordinates
    X = pd.DataFrame({'x':adata.obs[x],'y':adata.obs[y]})
    # Build the neighbourhood tree
    kdt = BallTree(X, metric='euclidean')
    dist, ind = kdt.query(X, k=int(nneigh))
    # Convert array to dataframe
    dist = pd.DataFrame.from_records(dist)
    # Calculate the concentric circles
    c1 = np.median(dist.drop(dist.columns[[0]], axis = 1)) # Median
    c2 = np.percentile(dist.drop(dist.columns[[0]], axis = 1), 95) # 95th percentile
    c3 = c2 + c1 # 95th perccentile + median
    # Update adata
    adata.uns['inner ring diameter'] = c1
    adata.uns['middle ring diameter'] = c2
    adata.uns['outer ring diameter'] = c3
    # return results
    return adata

def weight_neighbourhood (adata, c1=None, c2=None, c3=None,x='X_position',y='Y_position'):
    
    """
    adata - Ann Data object
    c1 - diameter of the immediate neighbours - Median
    c2- diameter of the second ring - 95th percentile
    c3- diameter of the outer ring - 95th perccentile + median
    Return:
        adata- ypdated adata with spatial weights and normalized spatial weights
        - adata.obs['spatial weights']
        - adata.obs['normalized spatial weights']
        
    """  
    # If c1,c2,c3 are not provided by user, check adata object
    if c1== None and c2== None and c3 == None:
        c1= adata.uns['inner ring diameter']
        c2= adata.uns['middle ring diameter']
        c3= adata.uns['outer ring diameter']
        
    # Create the dataframe with the co-ordinates
    X = pd.DataFrame({'x':adata.obs[x],'y':adata.obs[y]})
    # Build the neighbourhood tree
    kdt = BallTree(X, metric='euclidean')
    
    # Function to create a dict of indeces and distances
    ind_to1 = lambda x: dict(zip(x, np.repeat(1, len(x))))
    ind_dict = lambda x,y: dict(zip(x, y))
    # Function to remove intesecting elements
    def remove_intersect(index_toremove, dict_toremovefrom):
        for i in index_toremove:
            dict_toremovefrom.pop(i, None)
    # Function to normalize based on custom range
    def range_normalize (data, upper_limit, lower_limit):
        
        if len(data) >= 2:
            # calculate data range
            x = (max (data.values()) - min (data.values())) / len (data)
            # calculate normalization factor range
            y = (upper_limit - lower_limit) / len (data)
            # Step-2: For each data point calculate the normalization factor
            xij = []
            for i in data:
                xij = np.append(xij, ((max (data.values()) - data[i]) * y) / x)
            # Step-3: Compute the normalized values from the factors determined
            yij = []
            for j in xij:
                yij = xij + lower_limit
            # modify the data object to reflect the new normlized values
            modified_data = dict(zip(data.keys(), yij))
        elif len(data) == 1:
            data[list(data.keys())[0]] = upper_limit
            modified_data = data
        elif data == {}:
            modified_data = {}
        
        return modified_data
        
    # Function to merge the dict
    def Merge(dict1, dict2, dict3): 
        res = {**dict1, **dict2, **dict3} 
        return res 
    
    # Inner Ring calculations
    ind_c1 = kdt.query_radius(X, r=c1/2)
    # Delete self points from indeces
    for i in range(0, len(ind_c1)): ind_c1[i] = np.delete(ind_c1[i], np.argwhere(ind_c1[i] == i))
    # Merge with distance
    c1_dict = list(map(ind_to1, ind_c1.tolist()))
        
    # Middle ring calculations
    ind_c2, dist_c2 = kdt.query_radius(X, r=c2/2, return_distance= True)
    # Delete self points from indeces
    for i in range(0, len(ind_c2)): ind_c2[i] = np.delete(ind_c2[i], np.argwhere(ind_c2[i] == i))
    for i in range(0, len(dist_c2)): dist_c2[i] = np.delete(dist_c2[i], np.argwhere(dist_c2[i] == 0)) 
    # Merge with distance
    c2_dict = list(map(ind_dict, ind_c2.tolist(),dist_c2.tolist()))
    # Remove elements of inner circle from the middle ring
    c2_dict_cleaned = list(map(remove_intersect, ind_c1.tolist(), c2_dict))
    # Modify the cleaned dict to custom range of normalization 
    n = lambda x: range_normalize(x, 0.99, 0.5)
    c2_dict_cleaned_normalized = list(map(n, c2_dict))
    
    # Outer ring calculations
    ind_c3, dist_c3 = kdt.query_radius(X, r=c3/2, return_distance= True)
    # Delete self points from indeces
    for i in range(0, len(ind_c3)): ind_c3[i] = np.delete(ind_c3[i], np.argwhere(ind_c3[i] == i))
    for i in range(0, len(dist_c3)): dist_c3[i] = np.delete(dist_c3[i], np.argwhere(dist_c3[i] == 0)) 
    # Merge with distance
    c3_dict = list(map(ind_dict, ind_c3.tolist(),dist_c3.tolist()))
    # Remove elements of inner circle from the middle ring
    c3_dict_cleaned = list(map(remove_intersect, ind_c2.tolist(), c3_dict))
    # Modify the cleaned dict to custom range of normalization 
    n1 = lambda x: range_normalize(x, 0.49, 0.1)
    c3_dict_cleaned_normalized = list(map(n1, c3_dict))
    
    # Merge the three areas to get a unified list
    w_neighbourhood = list(map(Merge, c1_dict, c2_dict_cleaned_normalized, c3_dict_cleaned_normalized))
    # Update adata
    adata.obs['spatial weights'] = w_neighbourhood
    
    # Normalize the spatial weights
    def norm (data):
        norm_data = {k: v/sum(data.values()) for k, v in data.items()}
        return norm_data
    
    # Run the function on all cell neighbourhoods  
    norm_neighbourhood = list(map(norm, w_neighbourhood))
    adata.obs['normalized spatial weights'] = norm_neighbourhood

    # return adata
    return adata
    
    
def spatial_lag (adata, spatial_weights=None, use_raw=True):
    '''
    Parameters:
        adata - AnnData object
        weighted_neighbourhood - Weighted neighborhood dictionary returnd by weighted_neighbourhood
        function and normalized using normalize_weighted_neighbourhood function.
    Returns:
        adata - Updated AnnData object with a new argument- adata.spatial_lag
    '''
    # If user does not provide the spatial weights check adata oject
    if spatial_weights==None:
        spatial_weights = adata.obs['normalized spatial weights']
        dd = defaultdict(list)
        spatial_weights = spatial_weights.to_dict(dd)
        
    # Make a copy of the adata object
    adata.spatial_lag = adata.copy()

    # Convert the weighted_neighbourhood into a matrix
    wn_matrix = pd.DataFrame(spatial_weights).fillna(0)#.apply(pd.to_numeric)
    # Multiply weighted_neighbourhood with the expression values
    if use_raw==True:
        adata.spatial_lag.X = wn_matrix.dot(np.log1p(adata.raw.X))
    else:
        adata.spatial_lag.X = wn_matrix.dot(adata.X)   
    # return adata
    return adata

def s_lag (adata,use_raw=True):
    # Make a copy of the adata object
    adata.spatial_lag = adata.copy()
    
    # Split the neigbourhood information and their weights from the adata file
    norm_neighbourhood = adata.obs['normalized spatial weights']
    neighbours = {}
    weights = {}
    for i in range(0, len(norm_neighbourhood)):
        n_tmp = {i:[*norm_neighbourhood[i]]}
        neighbours = {**neighbours, **n_tmp} 
        w_tmp = {i:list(norm_neighbourhood[i].values())}
        weights = {**weights, **w_tmp} 
    
    # Function to create apatial lag for every marker
    def s_lag_apply (markers):
        # Get index
        m_idx = adata.var.index.tolist().index(markers) # Get the index of marker of interest
        if use_raw==True:
            tmp_dataframe = pd.DataFrame(np.log1p(adata.raw.X))
        else:
            tmp_dataframe = pd.DataFrame(adata.X)        
        data = np.array(tmp_dataframe[m_idx]).flatten()
        # create the weighted object
        wobject = ps.lib.weights.W(neighbours, weights)
        # Find the Moran index
        slag = ps.lib.weights.lag_spatial(wobject, data)
        return slag
    # Apply the moran statistics to all markers
    Spatial_lag = list(map(s_lag_apply, adata.var.index.tolist()))
    Spatial_lag = pd.DataFrame(Spatial_lag).T
    # Update adata
    adata.spatial_lag.X = Spatial_lag
    # Return
    return adata
    


def moran_stat (adata, permutations=1000):
    '''
    Parameters:
        adata- Ann data object
        permutations- int. Number of permutations to perform for calculating p-value
    Returns:
        updated adata with the following statisics
    '''
    # Split the neigbourhood information and their weights from the adata file
    norm_neighbourhood = adata.obs['normalized spatial weights']
    neighbours = {}
    weights = {}
    for i in range(0, len(norm_neighbourhood)):
        n_tmp = {i:[*norm_neighbourhood[i]]}
        neighbours = {**neighbours, **n_tmp} 
        w_tmp = {i:list(norm_neighbourhood[i].values())}
        weights = {**weights, **w_tmp} 
        
    def moran_apply (markers, permutations=permutations):
        # Get index
        m_idx = adata.var.index.tolist().index(markers) # Get the index of marker of interest
        tmp_dataframe = pd.DataFrame(adata.X)
        data = np.array(tmp_dataframe[m_idx]).flatten()
        # create the weighted object
        wobject = ps.lib.weights.W(neighbours, weights)
        # Find the Moran index
        I = ps.explore.esda.Moran(data, wobject, permutations=permutations)
        return I
        
    # Apply the moran statistics to all markers
    Moran_Index = list(map(moran_apply, adata.var.index.tolist()))
    # Update adata
    adata.var['Global Moran Stat'] = Moran_Index
    # Return
    return adata


def moran_locl_stat (adata, permutations=1000):
    '''
    Parameters:
        adata- Ann data object
        permutations- int. Number of permutations to perform for calculating p-value
    Returns:
        updated adata with the following statisics
    '''
    # Split the neigbourhood information and their weights from the adata file
    norm_neighbourhood = adata.obs['normalized spatial weights']
    neighbours = {}
    weights = {}
    for i in range(0, len(norm_neighbourhood)):
        n_tmp = {i:[*norm_neighbourhood[i]]}
        neighbours = {**neighbours, **n_tmp} 
        w_tmp = {i:list(norm_neighbourhood[i].values())}
        weights = {**weights, **w_tmp} 
        
    def moran_apply (markers, permutations=permutations):
        # Get index
        m_idx = adata.var.index.tolist().index(markers) # Get the index of marker of interest
        tmp_dataframe = pd.DataFrame(adata.X)
        data = np.array(tmp_dataframe[m_idx]).flatten()
        # create the weighted object
        wobject = ps.lib.weights.W(neighbours, weights)
        # Find the Moran index
        I = ps.explore.esda.Moran_Local(data, wobject, permutations=permutations)
        return I
        
    # Apply the moran statistics to all markers
    Moran_Index = list(map(moran_apply, adata.var.index.tolist()))
    # Update adata
    adata.var['Local Moran Stat'] = Moran_Index
    # Return
    return adata


def cluster_analyzer (adata, cluster_annotation, cell_annotation):
    '''
    Parameters:
        adata- AnnData object that has both cell type annotation and some clustering annotation for each cell
        cluster_annotation- The category into which the cell will be divided into (pre-defined by user)
        cell_annotation- Cell identity given to each cell by user.
    Returns:
        adata- with an updated information of the clusters and proportion of cell_annotation within each cluster.
    Example:
        cluster_analyzer (adata, cluster_annotation='leiden', cell_annotation='cells')
    '''
    # Intiate an empty dataframe for storing the results
    cell_counts = pd.DataFrame()
    for i in adata.obs[cluster_annotation].unique().tolist():
        df = pd.DataFrame(adata.obs[adata.obs[cluster_annotation] == i])
        cell_proprtion = pd.DataFrame(df[cell_annotation].value_counts())
        cell_proprtion.columns = [i]
        cell_counts = pd.concat([cell_counts, cell_proprtion], axis=1, sort=False)
    # Update adata
    adata.uns['cluster_analyzer'] = cell_counts
    return adata
        
        

























