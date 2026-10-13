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
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" />
        }
      >
        <Upload className="mr-2 h-4 w-4" />
        Import CSV
      </DialogTrigger>
      <DialogContent className="border-slate-800 bg-slate-900 max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-white">Import Players from CSV</DialogTitle>
          <DialogDescription className="text-slate-400">
            Upload a CSV file to bulk-import players
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="border-slate-700 text-slate-300"
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
              className="border-slate-700 text-slate-300"
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose File
            </Button>
          </div>

          {parseErrors.length > 0 && (
            <div className="rounded-lg border border-red-800 bg-red-900/20 p-3">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Parse Errors</span>
              </div>
              {parseErrors.map((err, i) => (
                <p key={i} className="text-sm text-red-300">{err}</p>
              ))}
            </div>
          )}

          {parsedData.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span className="text-sm text-slate-300">
                  {parsedData.length} rows parsed. Review before importing.
                </span>
              </div>
              <ScrollArea className="h-64 rounded-lg border border-slate-800">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">#</TableHead>
                      <TableHead className="text-slate-400">Name</TableHead>
                      <TableHead className="text-slate-400">Role</TableHead>
                      <TableHead className="text-slate-400">Base Price</TableHead>
                      <TableHead className="text-slate-400">Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 50).map((row, i) => (
                      <TableRow key={i} className="border-slate-800">
                        <TableCell className="text-slate-500">{i + 1}</TableCell>
                        <TableCell className="text-white">{String(row.name ?? '')}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-slate-600 text-slate-300">
                            {String(row.role ?? 'other')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white">{String(row.base_price ?? '')}</TableCell>
                        <TableCell className="text-slate-400">{String(row.category ?? '-')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              {parsedData.length > 50 && (
                <p className="text-sm text-slate-500">Showing first 50 of {parsedData.length} rows</p>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Import {parsedData.length} Players
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setParsedData([]); setParseErrors([]); }}
                  className="border-slate-700 text-slate-300"
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
