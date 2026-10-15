'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { importPlayersFromCSV } from './actions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Upload, Download, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ImportPlayersDialogProps {
  tournamentId: string;
}

const CSV_TEMPLATE = `name,display_name,jersey_number,role,batting_style,bowling_style,base_price,category,bio,previous_team
John Smith,J. Smith,7,batter,right-hand,,200000,A,Explosive opener,Team Alpha
Jane Doe,J. Doe,23,bowler,right-hand,right-arm-fast,150000,B,Quick pacer,Team Beta`;

export function ImportPlayersDialog({ tournamentId }: ImportPlayersDialogProps) {
  const [open, setOpen] = useState(false);
  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'player_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseErrors(results.errors.map((e) => `Row ${e.row}: ${e.message}`));
        } else {
          setParseErrors([]);
        }
        setParsedData(results.data as Record<string, unknown>[]);
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
      },
    });
  }

  async function handleImport() {
    if (parsedData.length === 0) return;
    setIsImporting(true);

    try {
      const result = await importPlayersFromCSV(tournamentId, parsedData);
      if (result.error) {
        if (result.validationErrors) {
          toast.error(`${result.validationErrors.length} rows have errors`);
        } else {
          toast.error(result.error);
        }
        return;
      }
      toast.success(`Imported ${result.imported} players (${result.skipped} skipped as duplicates)`);
      setOpen(false);
      setParsedData([]);
      router.refresh();
    } catch {
      toast.error('Import failed');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="border-border text-muted-foreground hover:bg-muted size-9 sm:size-auto sm:h-10 sm:px-4"
            aria-label="Import CSV"
          />
        }
      >
        <Upload className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Import CSV</span>
      </DialogTrigger>
      <DialogContent className="border-border bg-card max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Import Players from CSV</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload a CSV file to bulk-import players
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="border-border text-muted-foreground"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="border-border text-muted-foreground"
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose File
            </Button>
          </div>

          {parseErrors.length > 0 && (
            <div className="rounded-lg border border-destructive/40 bg-red-900/20 p-3">
              <div className="flex items-center gap-2 text-primary mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Parse Errors</span>
              </div>
              {parseErrors.map((err, i) => (
                <p key={i} className="text-sm text-destructive">{err}</p>
              ))}
            </div>
          )}

          {parsedData.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-muted-foreground">
                  {parsedData.length} rows parsed. Review before importing.
                </span>
              </div>
              <ScrollArea className="h-64 rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">#</TableHead>
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Role</TableHead>
                      <TableHead className="text-muted-foreground">Base Price</TableHead>
                      <TableHead className="text-muted-foreground">Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 50).map((row, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-foreground">{String(row.name ?? '')}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-border text-muted-foreground">
                            {String(row.role ?? 'other')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground">{String(row.base_price ?? '')}</TableCell>
                        <TableCell className="text-muted-foreground">{String(row.category ?? '-')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              {parsedData.length > 50 && (
                <p className="text-sm text-muted-foreground">Showing first 50 of {parsedData.length} rows</p>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Import {parsedData.length} Players
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setParsedData([]); setParseErrors([]); }}
                  className="border-border text-muted-foreground"
                >
                  Clear
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
