import Lensing from './lensing';

const construct = (_osd, _viewer, _viewer_config, _data_loads) => {
    return new Lensing(_osd, _viewer, _viewer_config, _data_loads);
}

export {construct}