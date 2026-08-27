"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";
import {
  ChevronLeft,
  Archive,
  UploadCloud,
  CheckCircle,
  Clock,
  Building2,
  FileText,
  Calendar,
  Edit2,
  Trash2,
  Eye,
  Download,
  FileImage,
  X,
  Pencil,
} from "lucide-react";
import {
  updateOrderStatus,
  toggleOrderArchive,
  attachOrderImage,
  deleteOrder,
  deleteOrderAttachment,
  updateOrderAttachment,
} from "@/actions/orders";
import { toast } from "sonner";
import { EditOrderModal } from "./edit-order-modal";

const STATUS_ORDER: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PRODUCT_RECEIVED,
  OrderStatus.IN_PRODUCTION,
  OrderStatus.COMPLETED,
  OrderStatus.READY_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

export function OrderDetailsClient({ order }: { order: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeImageName, setActiveImageName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Pre-upload Naming State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<
    Array<{ file: File; previewUrl: string; name: string }>
  >([]);

  // Rename Attachment State
  const [editingAttachment, setEditingAttachment] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isRenaming, startRenaming] = useTransition();

  const currentStatusIndex = STATUS_ORDER.indexOf(order.status as OrderStatus);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    startTransition(async () => {
      try {
        await updateOrderStatus({ orderId: order.id, status: newStatus });
        toast.success(`Order status updated to ${newStatus.replace(/_/g, " ")}`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to update status");
      }
    });
  };

  const handleArchive = async () => {
    startTransition(async () => {
      try {
        await toggleOrderArchive({ orderId: order.id, isArchived: !order.isArchived });
        toast.success(
          order.isArchived ? "Order restored to active" : "Order archived successfully"
        );
        router.push("/orders");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to update archive status");
      }
    });
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete order ${order.orderNumber}?`)) return;

    startTransition(async () => {
      try {
        await deleteOrder(order.id);
        toast.success(`Order ${order.orderNumber} deleted`);
        router.push("/orders");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete order");
      }
    });
  };

  const handleDeleteAttachment = async (attachmentId: string, name: string) => {
    if (!confirm(`Delete image attachment "${name}"?`)) return;

    startTransition(async () => {
      try {
        await deleteOrderAttachment(attachmentId);
        toast.success(`Image "${name}" deleted`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete attachment");
      }
    });
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPending = Array.from(files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim(),
    }));

    setPendingUploads(newPending);
    setShowUploadModal(true);
    e.target.value = "";
  };

  const handleUpdatePendingName = (index: number, newName: string) => {
    const updated = [...pendingUploads];
    updated[index].name = newName;
    setPendingUploads(updated);
  };

  const handleRemovePending = (index: number) => {
    const item = pendingUploads[index];
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    setPendingUploads(pendingUploads.filter((_, idx) => idx !== index));
  };

  const handleCancelPending = () => {
    pendingUploads.forEach((item) => {
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setPendingUploads([]);
    setShowUploadModal(false);
  };

  const handleConfirmUpload = async () => {
    if (pendingUploads.length === 0) return;

    setUploading(true);
    try {
      const sigRes = await fetch("/api/upload/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "new_model_embroidery" }),
      });
      const sigData = await sigRes.json();
      if (sigData.error) throw new Error(sigData.error);

      for (const item of pendingUploads) {
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("api_key", sigData.apiKey);
        formData.append("timestamp", String(sigData.timestamp));
        formData.append("signature", sigData.signature);
        formData.append("folder", sigData.folder);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`,
          { method: "POST", body: formData }
        );
        const uploadData = await uploadRes.json();

        if (uploadData.secure_url) {
          const finalName = item.name.trim() || item.file.name.replace(/\.[^/.]+$/, "");
          await attachOrderImage({
            orderId: order.id,
            imageUrl: uploadData.secure_url,
            publicId: uploadData.public_id,
            caption: finalName,
          });
        }
      }
      toast.success(`${pendingUploads.length} attachment${pendingUploads.length > 1 ? "s" : ""} uploaded and named!`);
      handleCancelPending();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveRename = () => {
    if (!editingAttachment || !editingAttachment.name.trim()) return;

    startRenaming(async () => {
      try {
        await updateOrderAttachment(editingAttachment.id, editingAttachment.name.trim());
        toast.success("Attachment renamed successfully");
        setEditingAttachment(null);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to rename attachment");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="p-2 bg-white border border-[#ede8e1] rounded-xl text-slate-600 hover:text-slate-900 shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Order {order.orderNumber}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Created on {formatDate(order.orderDate, "d MMMM yyyy")} · by {order.createdBy?.fullName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#ede8e1] rounded-2xl text-xs sm:text-sm font-medium text-slate-700 hover:bg-[#faf8f5] shadow-sm transition-colors"
          >
            <Edit2 className="w-4 h-4 text-slate-500" />
            <span>Edit Order</span>
          </button>

          <button
            onClick={handleArchive}
            disabled={isPending}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#ede8e1] rounded-2xl text-xs sm:text-sm font-medium text-slate-700 hover:bg-[#faf8f5] shadow-sm transition-colors"
          >
            <Archive className="w-4 h-4 text-slate-500" />
            <span>{order.isArchived ? "Unarchive" : "Archive"}</span>
          </button>

          <button
            onClick={handleDelete}
            disabled={isPending}
            title="Delete Order"
            className="p-2.5 bg-white border border-rose-200 text-rose-600 rounded-2xl hover:bg-rose-50 shadow-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Stepper */}
      <div className="bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            Production & Delivery Status
          </span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#164e3f] text-white">
            {order.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Stepper buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {STATUS_ORDER.map((st, idx) => {
            const isCompleted = idx <= currentStatusIndex && currentStatusIndex !== -1;
            const isCurrent = st === order.status;

            return (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                disabled={isPending}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                  isCurrent
                    ? "bg-[#164e3f] text-white border-[#164e3f] shadow-sm"
                    : isCompleted
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-[#FAF8F5] text-slate-500 border-[#ede8e1] hover:bg-slate-100"
                }`}
              >
                {st.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Order Meta & Buyer Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#ede8e1] rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
            Buyer Details
          </span>
          <p className="font-bold text-base text-slate-900">{order.buyer.companyName}</p>
          <p className="text-xs text-slate-500">{order.buyer.address}</p>
          <p className="text-xs text-slate-600 font-medium">{order.buyer.phone}</p>
        </div>

        <div className="bg-white border border-[#ede8e1] rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
            Order & Challan
          </span>
          <div className="space-y-1 text-xs">
            <p>
              <span className="text-slate-400">Challan #: </span>
              <span className="font-semibold text-slate-800">
                {order.challanNumber || "— (No Challan)"}
              </span>
            </p>
            <p>
              <span className="text-slate-400">Expected Delivery: </span>
              <span className="font-semibold text-slate-800">
                {formatDate(order.expectedDeliveryDate, "yyyy-MM-dd")}
              </span>
            </p>
            {order.notes && (
              <p>
                <span className="text-slate-400">Notes: </span>
                <span className="text-slate-700">{order.notes}</span>
              </p>
            )}
          </div>
        </div>

        <div className="bg-[#164e3f] text-white rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider font-semibold opacity-75">
            Order Total Amount
          </span>
          <p className="text-3xl font-bold">৳ {Number(order.totalAmount).toLocaleString("en-IN")}</p>
          <p className="text-xs opacity-80">
            {order.items.length} product line{order.items.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Product Line Items Table */}
      <div className="bg-white border border-[#ede8e1] rounded-2xl shadow-sm overflow-hidden space-y-0">
        <div className="p-5 border-b border-[#ede8e1]">
          <h3 className="font-bold text-slate-900 text-base">Product Line Items</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#ede8e1] text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-[#FAF8F5]/50">
                <th className="py-3.5 px-5">SL</th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Style Ref</th>
                <th className="py-3.5 px-4">Design Ref / Description</th>
                <th className="py-3.5 px-4 text-right">Per pcs</th>
                <th className="py-3.5 px-4 text-center">Quantity</th>
                <th className="py-3.5 px-5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede8e1]/60 text-sm">
              {order.items.map((item: any, idx: number) => (
                <tr key={item.id} className="hover:bg-[#FAF8F5]/60">
                  <td className="py-3.5 px-5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{item.productType}</td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">{item.styleRef || "—"}</td>
                  <td className="py-3.5 px-4 text-slate-800 font-mono text-xs">{item.designReference}</td>
                  <td className="py-3.5 px-4 text-right text-slate-700">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-800">{item.quantity}</td>
                  <td className="py-3.5 px-5 text-right font-bold text-slate-900">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Attachments Section */}
      <div className="bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Image Attachments</h3>
            <p className="text-xs text-slate-500">Order designs, slips and references</p>
          </div>

          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-[#164e3f] text-white rounded-2xl text-xs font-semibold hover:bg-[#124235] transition-colors shadow-sm self-start sm:self-auto">
            <UploadCloud className="w-4 h-4" />
            <span>{uploading ? "Uploading..." : "Upload Images"}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={handleFileSelection}
              className="hidden"
            />
          </label>
        </div>

        {order.attachments.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No image attachments uploaded for this order yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
            {order.attachments.map((att: any) => {
              const displayName = att.caption || "Order Attachment";
              return (
                <div
                  key={att.id}
                  className="bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all space-y-3.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#ede8e1] flex items-center justify-center text-[#164e3f] shrink-0 shadow-2xs">
                      <FileImage className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className="text-xs font-bold text-slate-900 truncate"
                        title={displayName}
                      >
                        {displayName}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        Attachment
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#ede8e1]/70 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() =>
                        setEditingAttachment({
                          id: att.id,
                          name: displayName,
                        })
                      }
                      title="Rename Attachment"
                      className="p-1.5 bg-white border border-[#ede8e1] rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        setActiveImage(att.imageUrl);
                        setActiveImageName(displayName);
                      }}
                      title="Preview Image"
                      className="p-1.5 bg-white border border-[#ede8e1] rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={att.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={displayName}
                      title="Download Image"
                      className="p-1.5 bg-white border border-[#ede8e1] rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => handleDeleteAttachment(att.id, displayName)}
                      title="Delete Image"
                      className="p-1.5 bg-white border border-rose-200 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rename Attachment Modal */}
      {editingAttachment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <h3 className="font-bold text-slate-900 text-sm">Rename Attachment</h3>
              <button
                type="button"
                onClick={() => setEditingAttachment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Attachment Name</label>
              <input
                type="text"
                value={editingAttachment.name}
                onChange={(e) =>
                  setEditingAttachment({
                    ...editingAttachment,
                    name: e.target.value,
                  })
                }
                placeholder="Enter attachment name..."
                className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ede8e1]">
              <button
                type="button"
                onClick={() => setEditingAttachment(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRenaming || !editingAttachment.name.trim()}
                onClick={handleSaveRename}
                className="px-4 py-2 bg-[#164e3f] hover:bg-[#124235] text-white rounded-xl text-xs font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isRenaming ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Name</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Upload Naming Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Name Attachments Before Upload</h2>
                <p className="text-xs text-slate-500">Set names for your selected images</p>
              </div>
              <button
                type="button"
                onClick={handleCancelPending}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {pendingUploads.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl"
                >
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover border border-[#ede8e1] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Image Name
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdatePendingName(idx, e.target.value)}
                      placeholder="e.g. Front Chest Logo, Slip..."
                      className="w-full px-3 py-1.5 bg-white border border-[#ede8e1] rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePending(idx)}
                    title="Remove from upload"
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ede8e1]">
              <button
                type="button"
                onClick={handleCancelPending}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploading || pendingUploads.length === 0}
                onClick={handleConfirmUpload}
                className="px-5 py-2.5 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading {pendingUploads.length} images...</span>
                  </>
                ) : (
                  <span>Upload & Attach ({pendingUploads.length})</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && (
        <EditOrderModal
          order={order}
          isOpen={true}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Lightbox Modal */}
      {activeImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <span className="text-sm font-bold text-slate-900">{activeImageName || "Image Preview"}</span>
              <div className="flex items-center gap-2">
                <a
                  href={activeImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setActiveImage(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <img
              src={activeImage}
              alt={activeImageName || "Full view"}
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
