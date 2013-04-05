//  Created by Alex Gordon on 26/03/2013.

#import <Foundation/Foundation.h>
#import "tern.h"

@interface TernTestDocument : NSObject<TernDocument>
  @property TernDelta* ternDelta;
  @property NSString* ternID;
  @property BOOL hasUnsavedChanges;
  @property NSURL* fileURL;
  @property NSString* stringContents;

- (void)open;

@end

@implementation TernTestDocument
- (id)init
{
    self = [super init];
    if (self) {
        self.ternID = TernGenerateUUID();
        self.ternDelta = [[TernDelta alloc] init];
        self.hasUnsavedChanges = NO;
        self.stringContents = @"";
    }
    return self;
}
- (void)open {
    self.stringContents = [[NSString alloc] initWithContentsOfURL:self.fileURL encoding:NSUTF8StringEncoding error:NULL];
}
@end


int main(int argc, const char * argv[])
{
    @autoreleasepool {
        NSString* projPath = @"/Users/alexgordon/Temporary/ternproxy/test/wrkspc";
        TernController* tern = [TernController sharedController];
        TernProject* proj = [tern projectForDirectoryPath:projPath];
        TernTestDocument* doc1 = [[TernTestDocument alloc] init];
        doc1.fileURL = [NSURL fileURLWithPath:@"/Users/alexgordon/Temporary/ternproxy/test/wrkspc/a.js"];
        [doc1 open];
        
        [proj notifyDocumentOpened:doc1];
        doc1.stringContents = @"window.";
        [proj requestCompletions:doc1 atLocation:doc1.stringContents.length callback:^(NSDictionary *cresult) {
            NSLog(@"GOT COMPLETIONS: %@", cresult);
        }];
    }
    
    dispatch_main();
    return 0;
}

