import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, Eye, ClipboardList, AlertTriangle } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface DiagnosticRequest {
  id: string;
  teacher_id: string;
  class_name: string;
  section: string;
  subject: string;
  purpose: string;
  suggested_count: number;
  approved_count: number | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  profiles?: { full_name: string | null } | null;
}

export const DiagnosticApprovalPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reviewRequest, setReviewRequest] = useState<DiagnosticRequest | null>(null);
  const [approvedCount, setApprovedCount] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-diagnostic-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagnostic_requests")
        .select("*, profiles:teacher_id(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DiagnosticRequest[];
    },
  });

  const openReview = (req: DiagnosticRequest) => {
    setReviewRequest(req);
    setApprovedCount(String(req.approved_count ?? req.suggested_count));
    setAdminNotes(req.admin_notes || "");
  };

  const handleDecision = async (action: "approved" | "rejected") => {
    if (!reviewRequest || !user) return;
    const count = parseInt(approvedCount);
    if (action === "approved" && (isNaN(count) || count < 1 || count > 200)) {
      toast.error("Approved count must be between 1 and 200");
      return;
    }

    setProcessing(true);
    const { error } = await supabase
      .from("diagnostic_requests")
      .update({
        status: action,
        approved_count: action === "approved" ? count : null,
        admin_notes: adminNotes.trim() || null,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", reviewRequest.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Request ${action}!`);
      // Insert notification alert
      await supabase.from("mismatch_alerts").insert({
        student_group: `Teacher: ${(reviewRequest.profiles as any)?.full_name || "Unknown"}`,
        lesson_type: `Diagnostic Request ${action}`,
        trigger_condition: `${reviewRequest.class_name} ${reviewRequest.section} - ${reviewRequest.subject}`,
        recommendation: action === "approved"
          ? `Approved ${count} questions. Teacher may now assign.`
          : `Request rejected. ${adminNotes.trim() || "No notes provided."}`,
        status: "flagged",
      });
      setReviewRequest(null);
      queryClient.invalidateQueries({ queryKey: ["admin-diagnostic-requests"] });
    }
    setProcessing(false);
  };

  const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "pending": return "secondary";
      case "approved": return "default";
      case "rejected": return "destructive";
      case "assigned": return "outline";
      case "completed": return "default";
      default: return "secondary";
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-3.5 w-3.5" />;
      case "approved": return <CheckCircle className="h-3.5 w-3.5" />;
      case "rejected": return <XCircle className="h-3.5 w-3.5" />;
      case "assigned": return <ClipboardList className="h-3.5 w-3.5" />;
      case "completed": return <CheckCircle className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  const pendingCount = requests?.filter(r => r.status === "pending").length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Diagnostic Question Approvals
          {pendingCount > 0 && (
            <Badge variant="destructive" className="gap-1 ml-2">
              <AlertTriangle className="h-3 w-3" /> {pendingCount} pending
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Review and approve teacher diagnostic question requests. Set the final question count for each class.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : !requests || requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No diagnostic requests submitted yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Suggested</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(r => (
                <TableRow key={r.id} className={r.status === "pending" ? "bg-muted/30" : ""}>
                  <TableCell className="font-medium">{(r.profiles as any)?.full_name || "Unknown"}</TableCell>
                  <TableCell>{r.class_name} - {r.section}</TableCell>
                  <TableCell>{r.subject}</TableCell>
                  <TableCell>{r.suggested_count}</TableCell>
                  <TableCell>{r.approved_count ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)} className="gap-1 capitalize">
                      {statusIcon(r.status)} {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openReview(r)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Review Dialog */}
      <Dialog open={!!reviewRequest} onOpenChange={open => !open && setReviewRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Diagnostic Request</DialogTitle>
          </DialogHeader>
          {reviewRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Teacher:</span>
                  <p className="font-medium text-foreground">{(reviewRequest.profiles as any)?.full_name || "Unknown"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Class:</span>
                  <p className="font-medium text-foreground">{reviewRequest.class_name} - {reviewRequest.section}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Subject:</span>
                  <p className="font-medium text-foreground">{reviewRequest.subject}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Suggested Count:</span>
                  <p className="font-medium text-foreground">{reviewRequest.suggested_count}</p>
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Purpose:</span>
                <p className="text-sm text-foreground bg-muted/50 rounded-md p-3 mt-1">{reviewRequest.purpose}</p>
              </div>

              {reviewRequest.status === "pending" ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Approved Question Count</Label>
                    <Input type="number" min={1} max={200} value={approvedCount} onChange={e => setApprovedCount(e.target.value)} />
                    <p className="text-xs text-muted-foreground">You may modify the count from the teacher's suggestion.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Admin Notes (optional)</Label>
                    <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Add notes or instructions for the teacher..." rows={2} />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => handleDecision("approved")} disabled={processing} className="flex-1 gap-1">
                      <CheckCircle className="h-4 w-4" /> Approve
                    </Button>
                    <Button variant="destructive" onClick={() => handleDecision("rejected")} disabled={processing} className="flex-1 gap-1">
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Badge variant={statusVariant(reviewRequest.status)} className="gap-1 capitalize">
                    {statusIcon(reviewRequest.status)} {reviewRequest.status}
                  </Badge>
                  {reviewRequest.approved_count && (
                    <p className="text-sm"><span className="text-muted-foreground">Approved Count:</span> <span className="font-medium text-foreground">{reviewRequest.approved_count}</span></p>
                  )}
                  {reviewRequest.admin_notes && (
                    <p className="text-sm"><span className="text-muted-foreground">Notes:</span> <span className="text-foreground">{reviewRequest.admin_notes}</span></p>
                  )}
                  {reviewRequest.approved_at && (
                    <p className="text-xs text-muted-foreground">Decided: {new Date(reviewRequest.approved_at).toLocaleString()}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
