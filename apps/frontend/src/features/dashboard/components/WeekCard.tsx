import { Link } from "react-router";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { WeekSummary } from "@/shared/types";
import { formatCurrency } from "@/shared/utils/formatters";
import { Calendar, Hash } from "lucide-react";

interface WeekCardProps {
  week: WeekSummary;
}

export function WeekCard({ week }: WeekCardProps) {
  return (
    <Link to={`/weeks/${week.id}`}>
      <Card className="py-2 hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="py-2 px-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{week.label}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {week.totalRecords ?? 0} registros
                </span>
                <span className="flex items-center gap-1">
                  {formatCurrency(week.totalAmount ?? 0)}
                </span>
              </div>
            </div>
            <Badge variant={week.status === "saved" ? "default" : "secondary"}>
              {week.status === "saved" ? "Guardado" : "Borrador"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
