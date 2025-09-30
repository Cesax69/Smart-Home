import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export interface FileInfo {
    originalName: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    fileType: string;
    category: string;
    userId?: number;
}

export class FileOrganizer {
    private basePath: string;
    private autoOrganize: boolean;
    private createUserFolders: boolean;

    constructor(basePath: string, autoOrganize = true, createUserFolders = true) {
        this.basePath = basePath;
        this.autoOrganize = autoOrganize;
        this.createUserFolders = createUserFolders;
    }

    /**
     * Determina la categoría del archivo basado en su extensión
     */
    private getFileCategory(extension: string): string {
        const ext = extension.toLowerCase().replace('.', '');
        
        const categories = {
            images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'],
            documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'],
            videos: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp'],
            audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
            archives: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
            others: []
        };

        for (const [category, extensions] of Object.entries(categories)) {
            if (extensions.includes(ext)) {
                return category;
            }
        }

        return 'others';
    }

    /**
     * Genera un nombre único para el archivo
     */
    private generateUniqueFileName(originalName: string): string {
        const ext = path.extname(originalName);
        const baseName = path.basename(originalName, ext);
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const uuid = uuidv4().slice(0, 8);
        
        return `${baseName}_${timestamp}_${uuid}${ext}`;
    }

    /**
     * Crea la estructura de directorios necesaria
     */
    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    /**
     * Organiza un archivo en la estructura de directorios
     */
    async organizeFile(
        file: Express.Multer.File, 
        userId?: number
    ): Promise<FileInfo> {
        const extension = path.extname(file.originalname);
        const category = this.getFileCategory(extension);
        const uniqueFileName = this.generateUniqueFileName(file.originalname);
        
        let targetDir = path.join(this.basePath, 'uploads');
        
        if (this.autoOrganize) {
            targetDir = path.join(targetDir, category);
        }
        
        if (this.createUserFolders && userId) {
            targetDir = path.join(targetDir, `user_${userId}`);
        }
        
        // Crear directorio si no existe
        await this.ensureDirectoryExists(targetDir);
        
        const finalPath = path.join(targetDir, uniqueFileName);
        
        // Mover el archivo temporal a su ubicación final
        await fs.rename(file.path, finalPath);
        
        return {
            originalName: file.originalname,
            fileName: uniqueFileName,
            filePath: finalPath,
            fileSize: file.size,
            fileType: extension,
            category,
            userId
        };
    }

    /**
     * Organiza un archivo en el directorio temporal
     */
    async organizeToTemp(file: Express.Multer.File): Promise<FileInfo> {
        const extension = path.extname(file.originalname);
        const uniqueFileName = this.generateUniqueFileName(file.originalname);
        
        const tempDir = path.join(this.basePath, 'temp');
        await this.ensureDirectoryExists(tempDir);
        
        const finalPath = path.join(tempDir, uniqueFileName);
        
        // Mover el archivo temporal
        await fs.rename(file.path, finalPath);
        
        return {
            originalName: file.originalname,
            fileName: uniqueFileName,
            filePath: finalPath,
            fileSize: file.size,
            fileType: extension,
            category: 'temp'
        };
    }

    /**
     * Limpia archivos temporales antiguos
     */
    async cleanupTempFiles(maxAgeHours = 24): Promise<number> {
        const tempDir = path.join(this.basePath, 'temp');
        let cleanedCount = 0;
        
        try {
            const files = await fs.readdir(tempDir);
            const maxAge = Date.now() - (maxAgeHours * 60 * 60 * 1000);
            
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime.getTime() < maxAge) {
                    await fs.unlink(filePath);
                    cleanedCount++;
                }
            }
        } catch (error) {
            console.error('Error cleaning temp files:', error);
        }
        
        return cleanedCount;
    }

    /**
     * Obtiene estadísticas de almacenamiento
     */
    async getStorageStats(): Promise<{
        totalFiles: number;
        totalSize: number;
        categoryCounts: Record<string, number>;
    }> {
        const stats = {
            totalFiles: 0,
            totalSize: 0,
            categoryCounts: {} as Record<string, number>
        };

        const uploadsDir = path.join(this.basePath, 'uploads');
        
        try {
            await this.calculateDirStats(uploadsDir, stats);
        } catch (error) {
            console.error('Error calculating storage stats:', error);
        }

        return stats;
    }

    private async calculateDirStats(
        dirPath: string, 
        stats: { totalFiles: number; totalSize: number; categoryCounts: Record<string, number> }
    ): Promise<void> {
        try {
            const items = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item.name);
                
                if (item.isDirectory()) {
                    await this.calculateDirStats(itemPath, stats);
                } else if (item.isFile()) {
                    const fileStats = await fs.stat(itemPath);
                    const extension = path.extname(item.name);
                    const category = this.getFileCategory(extension);
                    
                    stats.totalFiles++;
                    stats.totalSize += fileStats.size;
                    stats.categoryCounts[category] = (stats.categoryCounts[category] || 0) + 1;
                }
            }
        } catch (error) {
            // Directorio no existe o no se puede leer
        }
    }
}