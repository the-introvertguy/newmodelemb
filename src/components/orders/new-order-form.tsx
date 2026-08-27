"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createOrder, attachOrderImage } from "@/actions/orders";
import { createBuyer } from "@/actions/buyers";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, UploadCloud, X, Eye, Download, FileImage, Pencil } from "lucide-react";
import { toast } from "sonner";

interface ProductLine {
  productType: string;
  styleRef: string;
  designReference: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export function NewOrderForm({
  buyers: initialBuyers,
}: {
  buyers: { id: string; companyName: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [buyersList, setBuyersList] = useState(initialBuyers);
  const [showNewBuyerModal, setShowNewBuyerModal] = useState(false);

  // New Buyer Modal State
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newContactPerson, setNewContactPerson] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [isPendingBuyer, startTransitionBuyer] = useTransition();

  // Form State
  const [buyerId, setBuyerId] = useState("");
  const [customOrderNumber, setCustomOrderNumber] = useState("");
  const [reference, setReference] = useState("");
  const [challanNumber, setChallanNumber] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [generalNotes, setGeneralNotes] = useState("");

  // Product Line Items
  const [products, setProducts] = useState<ProductLine[]>([
    {
      productType: "",
      styleRef: "—",
      designReference: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
    },
  ]);

  // Image Uploads State
  const [attachedImages, setAttachedImages] = useState<
    { url: string; publicId: string; name: string }[]
  >([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageName, setPreviewImageName] = useState<string>("");

  // Pre-upload Naming State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<
    Array<{ file: File; previewUrl: string; name: string }>
  >([]);

  // Rename Attachment State
  const [editingImgIdx, setEditingImgIdx] = useState<number | null>(null);
  const [editingImgName, setEditingImgName] = useState<string>("");

  // Dynamic calculations
  const orderTotal = products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);

  const handleAddProduct = () => {
    setProducts([
      ...products,
      {
        productType: "",
        styleRef: "—",
        designReference: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveProduct = (index: number) => {
    if (products.length <= 1) {
      toast.error("An order must contain at least one product line item");
      return;
    }
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, field: keyof ProductLine, value: any) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    setProducts(updated);
  };

  const handleCreateBuyerInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim() || !newPhone.trim() || !newAddress.trim()) {
      toast.error("Please fill in company name, phone, and address");
      return;
    }

    startTransitionBuyer(async () => {
      try {
        const res = await createBuyer({
          companyName: newCompanyName.trim(),
          contactPerson: newContactPerson.trim() || newCompanyName.trim(),
          phone: newPhone.trim(),
          address: newAddress.trim(),
        });

        if (res.buyer) {
          setBuyersList((prev) => [
            ...prev,
            { id: res.buyer.id, companyName: res.buyer.companyName },
          ]);
          setBuyerId(res.buyer.id);
          toast.success(`Buyer "${res.buyer.companyName}" added and selected!`);
          setShowNewBuyerModal(false);
          setNewCompanyName("");
          setNewContactPerson("");
          setNewPhone("");
          setNewAddress("");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to create buyer");
      }
    });
  };

  // Stage files for naming before upload
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

  // Upload to Cloudinary with custom names
  const handleConfirmUpload = async () => {
    if (pendingUploads.length === 0) return;

    setUploadingImage(true);
    try {
      const sigRes = await fetch("/api/upload/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "new_model_embroidery" }),
      });
      const sigData = await sigRes.json();
      if (sigData.error) throw new Error(sigData.error);

      const newlyUploaded: Array<{ url: string; publicId: string; name: string }> = [];

      for (const item of pendingUploads) {
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("api_key", sigData.apiKey);
        formData.append("timestamp", String(sigData.timestamp));
        formData.append("signature", sigData.signature);
        formData.append("folder", sigData.folder);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        const uploadData = await uploadRes.json();
        if (uploadData.secure_url) {
          const finalName = item.name.trim() || item.file.name.replace(/\.[^/.]+$/, "");
          newlyUploaded.push({
            url: uploadData.secure_url,
            publicId: uploadData.public_id,
            name: finalName,
          });
        }
      }

      setAttachedImages((prev) => [...prev, ...newlyUploaded]);
      toast.success(`${newlyUploaded.length} attachment${newlyUploaded.length > 1 ? "s" : ""} added!`);
      handleCancelPending();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image to cloud");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!buyerId) {
      toast.error("Please select a buyer");
      return;
    }

    const invalidItem = products.find((p) => !p.productType.trim() || !p.designReference.trim());
    if (invalidItem) {
      toast.error("Please fill in Product type and Design reference for all line items");
      return;
    }

    setLoading(true);
    try {
      const res = await createOrder({
        orderNumber: customOrderNumber.trim() || undefined,
        buyerId,
        orderDate: new Date(orderDate),
        expectedDeliveryDate: expectedDelivery ? new Date(expectedDelivery) : null,
        challanNumber: challanNumber.trim() || null,
        status,
        notes: generalNotes.trim() || null,
        items: products.map((p) => ({
          productType: p.productType,
          styleRef: p.styleRef || "—",
          designReference: p.designReference,
          notes: p.description || null,
          quantity: Number(p.quantity),
          unitPrice: Number(p.unitPrice),
        })),
      });

      if (res.order) {
        for (const img of attachedImages) {
          await attachOrderImage({
            orderId: res.order.id,
            imageUrl: img.url,
            publicId: img.publicId,
            caption: img.name.trim() || null,
          });
        }

        toast.success(`Order ${res.order.orderNumber} created successfully!`);
        router.push(`/orders/${res.order.id}`);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">New Order</h1>
            <p className="text-xs text-slate-500 mt-1">Embroidery production batch</p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <Link
              href="/orders"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? "Saving..." : "Save Order"}
            </button>
          </div>
        </div>

        {/* Top Split: Order Information (left) & Order Total (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form Card (col-span-8) */}
          <div className="lg:col-span-8 bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-4">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 block">
              Order Information
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Buyer Select with Inline Add Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Buyer *</label>
                  <button
                    type="button"
                    onClick={() => setShowNewBuyerModal(true)}
                    className="text-[11px] text-[#164e3f] hover:underline font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Buyer</span>
                  </button>
                </div>
                <select
                  value={buyerId}
                  onChange={(e) => setBuyerId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                >
                  <option value="">Select buyer</option>
                  {buyersList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.companyName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Order ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Order ID
                </label>
                <input
                  type="text"
                  value={customOrderNumber}
                  onChange={(e) => setCustomOrderNumber(e.target.value)}
                  placeholder="Auto (YYYYMM0001) or custom"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                />
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reference</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Reference"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                />
              </div>

              {/* Challan # */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Challan #</label>
                <input
                  type="text"
                  value={challanNumber}
                  onChange={(e) => setChallanNumber(e.target.value)}
                  placeholder="CH-XXXX"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                />
              </div>

              {/* Order Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Order Date</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                />
              </div>

              {/* Expected Delivery */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Delivery
                </label>
                <input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
              >
                <option value="PENDING">Pending</option>
                <option value="PRODUCT_RECEIVED">Product Received</option>
                <option value="IN_PRODUCTION">In Production</option>
                <option value="COMPLETED">Completed</option>
                <option value="READY_FOR_DELIVERY">Ready for Delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Production Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Production Notes</label>
              <textarea
                rows={2}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Thread specs, instructions, packaging notes..."
                className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
              />
            </div>
          </div>

          {/* Right Summary Card (col-span-4) */}
          <div className="lg:col-span-4 bg-[#164e3f] text-white rounded-2xl p-6 shadow-sm space-y-4">
            <span className="text-[11px] font-semibold tracking-wider uppercase opacity-75 block">
              Order Total
            </span>
            <p className="text-4xl font-bold tabular-nums tracking-tight">
              ৳ {orderTotal.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs opacity-80">
              {products.length} product line{products.length > 1 ? "s" : ""}
            </p>

            <div className="pt-4 border-t border-white/20 space-y-2 text-xs">
              <div className="flex justify-between opacity-90">
                <span>Total Quantity:</span>
                <span className="font-semibold tabular-nums">
                  {products.reduce((s, p) => s + Number(p.quantity || 0), 0)} pcs
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Products Repeater Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Products</h2>
          </div>

          <div className="space-y-4">
            {products.map((p, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#ede8e1] rounded-2xl p-5 shadow-sm space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                    Product {idx + 1}
                  </span>
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={p.productType}
                      onChange={(e) => handleProductChange(idx, "productType", e.target.value)}
                      placeholder="Product type (e.g. Polo T-Shirt)"
                      required
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={p.styleRef}
                      onChange={(e) => handleProductChange(idx, "styleRef", e.target.value)}
                      placeholder="Style Ref (e.g. STYLE-901)"
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={p.designReference}
                      onChange={(e) =>
                        handleProductChange(idx, "designReference", e.target.value)
                      }
                      placeholder="Design Ref (e.g. D-118)"
                      required
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={p.quantity}
                      onChange={(e) =>
                        handleProductChange(idx, "quantity", Math.max(1, Number(e.target.value)))
                      }
                      placeholder="Qty"
                      required
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-8">
                    <input
                      type="text"
                      value={p.description}
                      onChange={(e) => handleProductChange(idx, "description", e.target.value)}
                      placeholder="Placement / notes (optional)"
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={p.unitPrice}
                      onChange={(e) =>
                        handleProductChange(idx, "unitPrice", Math.max(0, Number(e.target.value)))
                      }
                      placeholder="Price / pc"
                      required
                      className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                    />
                  </div>

                  <div className="sm:col-span-2 text-right font-bold text-slate-900 text-sm tabular-nums">
                    ৳ {(p.quantity * p.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddProduct}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#ede8e1] rounded-2xl text-sm font-medium text-slate-700 hover:bg-[#FAF8F5] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>

        {/* Image Attachments Section */}
        <div className="bg-white border border-[#ede8e1] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Attachments</h3>
              <p className="text-xs text-slate-500">Design artwork, samples and slips</p>
            </div>

            <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-colors shadow-sm self-start sm:self-auto">
              <UploadCloud className="w-4 h-4" />
              <span>{uploadingImage ? "Uploading..." : "Upload Images"}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploadingImage}
                onChange={handleFileSelection}
                className="hidden"
              />
            </label>
          </div>

          {attachedImages.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No images attached yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
              {attachedImages.map((img, idx) => (
                <div
                  key={idx}
                  className="bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all space-y-3.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#ede8e1] flex items-center justify-center text-[#164e3f] shrink-0 shadow-2xs">
                      <FileImage className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className="text-xs font-bold text-slate-900 truncate"
                        title={img.name}
                      >
                        {img.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        Attachment
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#ede8e1]/70 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingImgIdx(idx);
                        setEditingImgName(img.name);
                      }}
                      title="Rename Attachment"
                      className="p-1.5 bg-white border border-[#ede8e1] rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPreviewImageUrl(img.url);
                        setPreviewImageName(img.name);
                      }}
                      title="Preview Image"
                      className="p-1.5 bg-white border border-[#ede8e1] rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={img.name}
                      title="Download Image"
                      className="p-1.5 bg-white border border-[#ede8e1] rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setAttachedImages(attachedImages.filter((_, i) => i !== idx));
                      }}
                      title="Remove Attachment"
                      className="p-1.5 bg-white border border-rose-200 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* Rename Attachment Modal */}
      {editingImgIdx !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <h3 className="font-bold text-slate-900 text-sm">Rename Attachment</h3>
              <button
                type="button"
                onClick={() => setEditingImgIdx(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Attachment Name</label>
              <input
                type="text"
                value={editingImgName}
                onChange={(e) => setEditingImgName(e.target.value)}
                placeholder="Enter attachment name..."
                className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#164e3f]"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ede8e1]">
              <button
                type="button"
                onClick={() => setEditingImgIdx(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingImgIdx !== null) {
                    const updated = [...attachedImages];
                    updated[editingImgIdx].name = editingImgName.trim() || "Attachment";
                    setAttachedImages(updated);
                    setEditingImgIdx(null);
                    toast.success("Attachment renamed");
                  }
                }}
                className="px-4 py-2 bg-[#164e3f] hover:bg-[#124235] text-white rounded-xl text-xs font-medium transition-colors shadow-sm"
              >
                Save Name
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
                disabled={uploadingImage || pendingUploads.length === 0}
                onClick={handleConfirmUpload}
                className="px-5 py-2.5 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {uploadingImage ? (
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

      {/* Lightbox Preview Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setPreviewImageUrl(null);
            setPreviewImageName("");
          }}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <span className="text-sm font-bold text-slate-900">
                {previewImageName || "Image Preview"}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={previewImageName || "attachment"}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => {
                    setPreviewImageUrl(null);
                    setPreviewImageName("");
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <img
              src={previewImageUrl}
              alt={previewImageName || "Preview"}
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      )}

      {/* Inline Create Buyer Modal */}
      {showNewBuyerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#ede8e1] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#ede8e1]">
              <h2 className="text-lg font-bold text-slate-900">Add New Buyer</h2>
              <button
                onClick={() => setShowNewBuyerModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBuyerInline} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="e.g. Apex Apparels Ltd."
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={newContactPerson}
                  onChange={(e) => setNewContactPerson(e.target.value)}
                  placeholder="Manager / Merchandiser"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+880 1712-345678"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Gazipur, Dhaka"
                  className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#ede8e1] rounded-2xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ede8e1]">
                <button
                  type="button"
                  onClick={() => setShowNewBuyerModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPendingBuyer}
                  className="px-5 py-2 bg-[#164e3f] hover:bg-[#124235] text-white rounded-2xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  Save Buyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
