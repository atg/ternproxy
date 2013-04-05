#import <Cocoa/Cocoa.h>

NSString* TernGenerateUUID();

@protocol TernDocument;
@class TernContext, TernProject, TernDelta;

// Singleton. Communicates with the tern process
@interface TernController : NSObject

+ (id)sharedController;

- (void)sendRequestToURLPath:(NSString*)urlPath
               urlParameters:(NSDictionary*)urlParams
              postParameters:(NSDictionary*)postParameters
               fileParameter:(NSString*)fileContents
                     project:(TernProject*)proj
                    callback:(void(^)(NSDictionary*))callback;

- (TernProject*)projectForDirectoryPath:(NSString*)path;

// See https://gist.github.com/fileability/505060454f4fe3615cff

@end

// Represents a tern
@interface TernProject : NSObject
@property (copy) NSString* uuid;
@property (copy) NSString* dir;

// Untitled files exist in the "null project"
+ (id)nullProject;

- (void)notifyDocumentOpened:(id<TernDocument>)doc;
- (void)notifyDocumentClosed:(id<TernDocument>)doc;
- (void)requestCompletions:(id<TernDocument>)doc atLocation:(long)cursorLocation callback:(void(^)(NSDictionary*))callback;

@end

// A document stores the contents of a buffer and a file path.
// Documents may not match up completely with files on disk, the most obvious example being unsaved changes. Documents may not exist on disk at all, or may point to a file that no longer exists
@protocol TernDocument<NSObject>
- (BOOL)hasUnsavedChanges;
- (NSURL*)fileURL;
- (NSString*)stringContents;

- (NSString*)ternID;
- (TernDelta*)ternDelta;

@end

@interface TernDelta : NSObject
@property (copy) NSString* oldContents;
- (NSDictionary*)deltaForNewContents:(NSString*)contents;
@end
