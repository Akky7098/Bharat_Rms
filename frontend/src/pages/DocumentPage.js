import { useEffect, useMemo, useState } from "react";
import {
  FolderPlus,
  Upload,
  Folder,
  ArrowLeft,
  Download,
  Trash2,
  FileText,
  X,
  Search,
  Lock,
  ShieldCheck,
  Users,
} from "lucide-react";
import "./DocumentPage.css";

import {
  createDocumentFolder,
  getDocumentFolders,
  deleteDocumentFolder,
  uploadDocumentFile,
  getDocuments,
  deleteDocumentFile,
  getFullFileUrl,
} from "../services/documentService";

function DocumentPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = ["admin", "super_admin"].includes(user?.role);

  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);

  const [loading, setLoading] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [search, setSearch] = useState("");

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [folderForm, setFolderForm] = useState({
    name: "",
  });

  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    accessLevel: "private",
    file: null,
  });

  const [uploadProgress, setUploadProgress] = useState({
    show: false,
    percent: 0,
    uploadedMB: 0,
    totalMB: 0,
    fileName: "",
    status: "",
  });

  const fetchFolders = async () => {
    try {
      setFolderLoading(true);
      const res = await getDocumentFolders();
      setFolders(res.data.data || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to fetch folders");
    } finally {
      setFolderLoading(false);
    }
  };

  const fetchDocuments = async (folderId) => {
    try {
      setLoading(true);
      const res = await getDocuments(folderId);
      setDocuments(res.data.data || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (activeFolder?._id) {
      fetchDocuments(activeFolder._id);
    }
  }, [activeFolder]);

  const filteredFolders = useMemo(() => {
    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [folders, search]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) =>
      `${doc.title} ${doc.description} ${doc.originalFileName}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [documents, search]);

  const resetFolderForm = () => {
    setFolderForm({
      name: "",
    });
  };

  const resetUploadForm = () => {
    setUploadForm({
      title: "",
      description: "",
      accessLevel: "private",
      file: null,
    });
  };

  const resetUploadProgress = () => {
    setUploadProgress({
      show: false,
      percent: 0,
      uploadedMB: 0,
      totalMB: 0,
      fileName: "",
      status: "",
    });
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();

    const folderName = folderForm.name.trim();

    if (!folderName) {
      alert("Folder name is required");
      return;
    }

    const alreadyExists = folders.some(
      (folder) => folder.name.toLowerCase() === folderName.toLowerCase()
    );

    if (alreadyExists) {
      alert("Folder with this name already exists");
      return;
    }

    try {
      setCreatingFolder(true);

      await createDocumentFolder({
        name: folderName,
      });

      resetFolderForm();
      setShowFolderModal(false);
      fetchFolders();
      alert("Folder created successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleUploadFile = async (e) => {
    e.preventDefault();

    if (!activeFolder?._id) {
      alert("Please open a folder first");
      return;
    }

    if (!uploadForm.title.trim()) {
      alert("File title is required");
      return;
    }

    if (!uploadForm.file) {
      alert("Please select a file");
      return;
    }

    if (uploadForm.file.size > 30 * 1024 * 1024) {
      alert("File size must be under 30MB");
      return;
    }

    try {
      setUploading(true);

      const data = {
        folderId: activeFolder._id,
        title: uploadForm.title.trim(),
        description: uploadForm.description,
        accessLevel: isAdmin ? uploadForm.accessLevel : "private",
      };

      setUploadProgress({
        show: true,
        percent: 0,
        uploadedMB: 0,
        totalMB: uploadForm.file.size / (1024 * 1024),
        fileName: uploadForm.file.name,
        status: "Uploading...",
      });

      await uploadDocumentFile(data, uploadForm.file, (progressEvent) => {
        const loaded = progressEvent.loaded || 0;
        const total = progressEvent.total || uploadForm.file.size;
        const percent = Math.round((loaded * 100) / total);

        setUploadProgress({
          show: true,
          percent,
          uploadedMB: loaded / (1024 * 1024),
          totalMB: total / (1024 * 1024),
          fileName: uploadForm.file.name,
          status: percent >= 100 ? "Processing file..." : "Uploading...",
        });
      });

      setUploadProgress((prev) => ({
        ...prev,
        percent: 100,
        uploadedMB: prev.totalMB,
        status: "Uploaded successfully",
      }));

      resetUploadForm();
      setShowUploadModal(false);

      await fetchDocuments(activeFolder._id);
      await fetchFolders();

      alert("Document uploaded successfully");

      setTimeout(() => {
        resetUploadProgress();
      }, 1200);
    } catch (error) {
      resetUploadProgress();
      alert(error.response?.data?.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm("Delete this folder and its documents?")) return;

    try {
      await deleteDocumentFolder(folderId);
      fetchFolders();
      alert("Folder deleted successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete folder");
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm("Delete this document?")) return;

    try {
      await deleteDocumentFile(documentId);
      fetchDocuments(activeFolder._id);
      fetchFolders();
      alert("Document deleted successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete document");
    }
  };

  const formatFileSize = (size) => {
    if (!size) return "-";
    const mb = size / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(size / 1024).toFixed(1)} KB`;
  };

  const getAccessBadge = (accessLevel) => {
    if (accessLevel === "private") {
      return (
        <span className="doc-access private">
          <Lock size={13} /> Private
        </span>
      );
    }

    if (accessLevel === "admin_only") {
      return (
        <span className="doc-access admin">
          <ShieldCheck size={13} /> Admin Only
        </span>
      );
    }

    return (
      <span className="doc-access users">
        <Users size={13} /> All Users
      </span>
    );
  };

  return (
    <div className="document-page">
      <div className="doc-header">
        <div>
          <h1>Document Center</h1>
          <p>
            Manage brochures, quotation formats, certificates and internal
            documents.
          </p>
        </div>

        <div className="doc-actions">
          {activeFolder && (
            <button
              className="doc-btn secondary"
              onClick={() => {
                setActiveFolder(null);
                setDocuments([]);
                setSearch("");
                fetchFolders();
              }}
              type="button"
            >
              <ArrowLeft size={17} />
              Back
            </button>
          )}

          {!activeFolder && isAdmin && (
            <button
              className="doc-btn primary"
              onClick={() => setShowFolderModal(true)}
              type="button"
            >
              <FolderPlus size={17} />
              Create Folder
            </button>
          )}

          {activeFolder && (
            <button
              className="doc-btn primary"
              onClick={() => setShowUploadModal(true)}
              type="button"
            >
              <Upload size={17} />
              Upload File
            </button>
          )}
        </div>
      </div>

      <div className="doc-toolbar">
        <div className="doc-search">
          <Search size={18} />
          <input
            type="text"
            placeholder={
              activeFolder ? "Search documents..." : "Search folders..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {activeFolder && (
          <div className="doc-current-folder">
            <Folder size={18} />
            <span>{activeFolder.name}</span>
          </div>
        )}
      </div>

      {!activeFolder && (
        <div className="folder-grid">
          {folderLoading ? (
            <div className="doc-empty">Loading folders...</div>
          ) : filteredFolders.length === 0 ? (
            <div className="doc-empty">
              <Folder size={42} />
              <h3>No folders found</h3>
              <p>Create folders like Brochure, Quotation Format or Certificates.</p>
            </div>
          ) : (
            filteredFolders.map((folder) => (
              <div
                className="folder-card"
                key={folder._id}
                onClick={() => {
                  setActiveFolder(folder);
                  setSearch("");
                }}
              >
                <div className="folder-icon-box">
                  <Folder size={34} />
                </div>

                <div className="folder-info">
                  <h3>{folder.name}</h3>
                  <p>
                    {folder.documentCount || 0}{" "}
                    {(folder.documentCount || 0) === 1 ? "file" : "files"}
                  </p>
                </div>

                {isAdmin && (
                  <button
                    className="folder-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder._id);
                    }}
                    type="button"
                    title="Delete folder"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeFolder && (
        <div className="document-list">
          {loading ? (
            <div className="doc-empty">Loading documents...</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="doc-empty">
              <FileText size={42} />
              <h3>No documents found</h3>
              <p>Upload your first file inside this folder.</p>
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div className="document-card" key={doc._id}>
                <div className="document-file-icon">
                  <FileText size={28} />
                </div>

                <div className="document-main">
                  <div className="document-title-row">
                    <h3>{doc.title}</h3>
                    {getAccessBadge(doc.accessLevel)}
                  </div>

                  <p>{doc.description || "No description added"}</p>

                  <div className="document-meta">
                    <span>{doc.originalFileName}</span>
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>Uploaded by {doc.uploadedBy?.name || "User"}</span>
                  </div>
                </div>

                <div className="document-actions">
                  <a
                    href={getFullFileUrl(doc.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="doc-icon-btn download"
                    title="Download / View"
                  >
                    <Download size={18} />
                  </a>

                  {(isAdmin ||
                    String(doc.uploadedBy?.userId) === String(user?._id)) && (
                    <button
                      className="doc-icon-btn delete"
                      onClick={() => handleDeleteDocument(doc._id)}
                      type="button"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showFolderModal && (
        <div className="doc-modal-overlay">
          <div className="doc-modal">
            <div className="doc-modal-header">
              <h2>Create Folder</h2>
              <button
                onClick={() => {
                  if (creatingFolder) return;
                  setShowFolderModal(false);
                  resetFolderForm();
                }}
                type="button"
                disabled={creatingFolder}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="doc-form">
              <label>
                Folder Name
                <input
                  type="text"
                  value={folderForm.name}
                  onChange={(e) =>
                    setFolderForm({ ...folderForm, name: e.target.value })
                  }
                  placeholder="Example: Brochure"
                  disabled={creatingFolder}
                />
              </label>

              <div className="doc-modal-actions">
                <button
                  className="doc-btn secondary"
                  type="button"
                  disabled={creatingFolder}
                  onClick={() => {
                    setShowFolderModal(false);
                    resetFolderForm();
                  }}
                >
                  Cancel
                </button>

                <button
                  className="doc-btn primary"
                  type="submit"
                  disabled={creatingFolder || !folderForm.name.trim()}
                >
                  {creatingFolder ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="doc-modal-overlay">
          <div className="doc-modal large">
            <div className="doc-modal-header">
              <h2>Upload File</h2>
              <button
                onClick={() => {
                  if (uploading) return;
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                type="button"
                disabled={uploading}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadFile} className="doc-form">
              <label>
                File Title
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, title: e.target.value })
                  }
                  placeholder="Example: Alloy Steel Brochure"
                  disabled={uploading}
                />
              </label>

              <label>
                Description
                <textarea
                  value={uploadForm.description}
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Short detail visible to users"
                  disabled={uploading}
                />
              </label>

              {isAdmin && (
                <label>
                  Access Level
                  <select
                    value={uploadForm.accessLevel}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        accessLevel: e.target.value,
                      })
                    }
                    disabled={uploading}
                  >
                    <option value="private">Private - Only Me</option>
                    <option value="admin_only">Admin Only</option>
                    <option value="all_users">All Users</option>
                  </select>
                </label>
              )}

              {!isAdmin && (
                <div className="doc-note">
                  Your uploaded file will be private and visible only to you.
                </div>
              )}

              <label>
                Select File
                <input
                  type="file"
                  disabled={uploading}
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      file: e.target.files[0],
                    })
                  }
                />
              </label>

              {uploadForm.file && (
                <div className="selected-file-box">
                  <FileText size={18} />
                  <span>{uploadForm.file.name}</span>
                  <strong>{formatFileSize(uploadForm.file.size)}</strong>
                </div>
              )}

              <div className="doc-modal-actions">
                <button
                  className="doc-btn secondary"
                  type="button"
                  disabled={uploading}
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                >
                  Cancel
                </button>

                <button
                  className="doc-btn primary"
                  type="submit"
                  disabled={
                    uploading || !uploadForm.title.trim() || !uploadForm.file
                  }
                >
                  {uploading ? "Uploading..." : "Upload File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {uploadProgress.show && (
        <div className="upload-progress-toast">
          <div className="upload-progress-head">
            <strong>{uploadProgress.status}</strong>
            <span>{uploadProgress.percent}%</span>
          </div>

          <p>{uploadProgress.fileName}</p>

          <div className="upload-progress-bar">
            <div style={{ width: `${uploadProgress.percent}%` }} />
          </div>

          <small>
            {uploadProgress.uploadedMB.toFixed(2)} MB of{" "}
            {uploadProgress.totalMB.toFixed(2)} MB uploaded
          </small>
        </div>
      )}
    </div>
  );
}

export default DocumentPage;