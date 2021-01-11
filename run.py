from waitress import serve
from cycif_viewer import app

serve(app, host='0.0.0.0', port=8000, max_request_body_size=107374182400, max_request_header_size=8589934592)
