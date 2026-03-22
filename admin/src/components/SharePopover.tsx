"use client";

import { Copy, Globe, Users, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { motion, AnimatePresence } from "framer-motion";

interface SharePopoverProps {
  noteId: number;
  initialPublished: boolean;
  initialCommunity: boolean;
  initialShareUuid: string | null;
}

export function SharePopover({
  noteId,
  initialPublished,
  initialCommunity,
  initialShareUuid,
}: SharePopoverProps) {
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [isCommunity, setIsCommunity] = useState(initialCommunity);
  const [shareUuid, setShareUuid] = useState(initialShareUuid);
  const [loading, setLoading] = useState(false);

  // Use window.location only on client
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const publicUrl = shareUuid ? `${origin}/s/${shareUuid}` : "";

  const handlePublishToggle = async (checked: boolean) => {
    setLoading(true);
    // Optimistic update
    setIsPublished(checked);
    
    try {
      const updatedNote = await api.patch<any>(`/notes/${noteId}/update`, {
        is_published: checked,
      });
      // Update UUID if it was generated
      if (updatedNote.share_uuid) {
        setShareUuid(updatedNote.share_uuid);
      }
      // Sync state with server response to be safe
      setIsPublished(updatedNote.is_published);
      gooeyToast.success(checked ? "Note published to web" : "Note unpublished");
    } catch (err) {
      setIsPublished(!checked); // Revert
      gooeyToast.error("Failed to update publish settings");
    } finally {
      setLoading(false);
    }
  };

  const handleCommunityToggle = async (checked: boolean) => {
    setLoading(true);
    setIsCommunity(checked);
    
    try {
      await api.patch(`/notes/${noteId}/update`, {
        is_community: checked,
      });
      gooeyToast.success(checked ? "Added to community feed" : "Removed from community feed");
    } catch (err) {
      setIsCommunity(!checked);
      gooeyToast.error("Failed to update community settings");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    gooeyToast.success("Link copied to clipboard");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 h-8 px-3 transition-opacity hover:opacity-70"
          style={{ color: "var(--sub-color)" }}
        >
          <Share2 size={14} />
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden" style={{ backgroundColor: "var(--sub-alt-color)", border: "1px solid var(--border-color)" }}>
        <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--bg-color)" }}>
                    <Globe size={18} style={{ color: "var(--main-color)" }} />
                </div>
                <div>
                    <h4 className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>Share Note</h4>
                    <p className="text-xs" style={{ color: "var(--sub-color)" }}>Manage visibility and access</p>
                </div>
            </div>

            {/* Public Link Section */}
            <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-color)", border: "1px solid var(--border-color)" }}>
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <Globe size={14} style={{ color: isPublished ? "var(--main-color)" : "var(--sub-color)" }} />
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-color)" }}>Public Link</span>
                    </div>
                    <Switch 
                        checked={isPublished} 
                        onCheckedChange={handlePublishToggle} 
                        disabled={loading}
                    />
                </div>
                
                <AnimatePresence>
                    {isPublished && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-3 flex gap-2">
                                <input 
                                    readOnly 
                                    value={publicUrl} 
                                    className="flex-1 text-xs px-2 py-1.5 rounded border bg-transparent truncate font-mono"
                                    style={{ 
                                        borderColor: "var(--border-color)", 
                                        color: "var(--sub-color)" 
                                    }} 
                                />
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={copyLink}
                                    className="h-7 px-2 hover:opacity-90"
                                    style={{ backgroundColor: "var(--main-color)", color: "var(--bg-color)" }}
                                >
                                    <Copy size={12} />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Community Section */}
            <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-color)", border: "1px solid var(--border-color)" }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users size={14} style={{ color: isCommunity ? "var(--main-color)" : "var(--sub-color)" }} />
                        <div className="flex flex-col">
                            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-color)" }}>Community Feed</span>
                        </div>
                    </div>
                    <Switch 
                        checked={isCommunity} 
                        onCheckedChange={handleCommunityToggle}
                        disabled={loading}
                    />
                </div>
                <p className="text-[10px] mt-1.5 ml-0.5" style={{ color: "var(--sub-color)" }}>
                    Visible to other users in the Explore tab.
                </p>
            </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
