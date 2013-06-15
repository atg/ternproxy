#import "tern.h"
#import "CSAPICall.h"
//#import "NSMutableData+CSAPI.h"

#if __has_feature(objc_arc)
#define USES_ARC
#endif

static const int TERN_LENGTH_LIMIT = 1024 * 1024; // Disable completions in documents larger than 1MB
typedef uint16_t UTF16;
typedef uint32_t UTF32;



NSString* TernGenerateUUID() {
    return [NSString stringWithFormat:@"%x%x%x", arc4random(), arc4random(), arc4random()]; // fuck it.
}

static long TernSharedPrefix(unichar* a, unichar* b, long an, long bn) {
    
    long i = 0;
    long n = MIN(an, bn);
    while (i < n) {
        if (a[i] != b[i])
            break;
        i++;
    }
    
    return i;
}
static long TernSharedSuffix(unichar* a, unichar* b, long an, long bn) {
    
    long i = 0;
    long n = MIN(an, bn);
    while (i < n) {
        if (a[an - i - 1] != b[bn - i - 1])
            break;
        i++;
    }
    
    return i;
}

static NSRange TernChangedRange(NSString* a, NSString* b, NSRange* newUnequal) {
    
    size_t an = [a length];
    size_t bn = [b length];
    NSLog(@"LX %d", __LINE__);
    if (an == 0)
        return NSMakeRange(NSNotFound, 0);
    NSLog(@"LX %d", __LINE__);
    if (bn == 0)
        return NSMakeRange(NSNotFound, 0);
    NSLog(@"LX %d", __LINE__);
    
    
    unichar* abuff = calloc(an + 1, sizeof(unichar));
    [a getCharacters:abuff range:NSMakeRange(0, an)];
    
    unichar* bbuff = calloc(an + 1, sizeof(unichar));
    [b getCharacters:bbuff range:NSMakeRange(0, bn)];
    
    long prefix = TernSharedPrefix(abuff, bbuff, an, bn);
    NSLog(@"prefix = %ld", prefix);
    
    long suffix = TernSharedSuffix(abuff, bbuff, an, bn);
    NSLog(@"suffix = %ld", suffix);
    
    free(abuff);
    free(bbuff);
    
    
    long uneqLen = an - prefix - suffix;
    NSLog(@"LX %d", __LINE__);
    if (uneqLen <= 0)
        return NSMakeRange(NSNotFound, 0);
    NSLog(@"LX %d", __LINE__);
    if (prefix >= an)
        return NSMakeRange(NSNotFound, 0);
    NSLog(@"LX %d", __LINE__);
    if (suffix >= an)
        return NSMakeRange(NSNotFound, 0);
    NSLog(@"LX %d", __LINE__);
    if (prefix + suffix >= an)
        return NSMakeRange(NSNotFound, 0);
    NSLog(@"LX %d", __LINE__);
    
    
    long newUnequalLen = bn - prefix - suffix;
    if (newUnequalLen <= 0)
        return NSMakeRange(NSNotFound, 0);
    NSLog(@"LX %d", __LINE__);
    if (prefix >= bn)
        return NSMakeRange(NSNotFound, 0);
    NSLog(@"LX %d", __LINE__);
    if (suffix >= bn)
        return NSMakeRange(NSNotFound, 0);
    NSLog(@"LX %d", __LINE__);
    if (prefix + suffix >= bn)
        return NSMakeRange(NSNotFound, 0);
    
    NSLog(@"LX %d", __LINE__);
    
    long uneqLoc = prefix;
    NSRange unequalRange = NSMakeRange(uneqLoc, uneqLen);
    *newUnequal = NSMakeRange(uneqLoc, newUnequalLen);
    return [a rangeOfComposedCharacterSequencesForRange:unequalRange];
}



// Singleton. Communicates with the tern process
@implementation TernController {
    NSMutableDictionary* projects;
    dispatch_queue_t queue;
    NSTask* task;
}

+ (id)sharedController {
    static dispatch_once_t onceToken;
    static TernController* sharedController;
    dispatch_once(&onceToken, ^{
        sharedController = [[[self class] alloc] init];
    });
    return sharedController;
}
- (id)init {
    self = [super init];
    if (!self)
        return nil;
    
    projects = [[NSMutableDictionary alloc] init];
    queue = dispatch_queue_create("tern.communications", NULL);
    
    return self;
}

- (void)launch {
    task = [NSTask launchedTaskWithLaunchPath:@"/usr/local/bin/node" arguments:@[@"/Users/alexgordon/Temporary/ternproxy/src/server.js"]];
}

- (void)sendRequestToURLPath:(NSString*)urlPath
               urlParameters:(NSDictionary*)urlParams
              postParameters:(NSDictionary*)postParameters
               fileParameter:(NSString*)fileContents
                     project:(TernProject*)proj
                    callback:(void(^)(NSDictionary*))callback {
//    NSLog(@"POST %@", urlPath);
//    NSLog(@"  url %@", urlParams);
//    NSLog(@"  post %@", postParameters);
//    NSLog(@"  file [%@]", fileContents);
//    NSLog(@"uu = %@", [NSString stringWithFormat:@"http://localhost:8542%@", urlPath]);
    
    NSMutableDictionary* params = [postParameters mutableCopy];
    [params setObject:proj.uuid forKey:@"project_id"];
    [params setObject:proj.dir forKey:@"project_dir"];
    
    if (fileContents)
        [params setObject:fileContents forKey:@"FILE"];
    
    NSLog(@"params = %@", params);
    CSAPICall* call = [CSAPICall POSTCallWithURL:[NSString stringWithFormat:@"http://127.0.0.1:8542%@", urlPath] fields:params];
    
//    NSLog(@"%@", [NSString stringWithFormat:@"http://localhost:8542%@", urlPath]);
    NSLog(@"%@", [NSString stringWithFormat:@"http://127.0.0.1:8542%@", urlPath]);
//    call.request = [NSURLRequest requestWithURL:[NSURL URLWithString:
//                                                 /*[NSString stringWithFormat:@"http://127.0.0.1:8542%@", urlPath]*/]];
    call.block = ^(CSAPICall *thecall, NSDictionary *args, NSError *err) {
        NSLog(@"Done");
        NSData* data = thecall.responseData;
        id json = [NSJSONSerialization JSONObjectWithData:data options:0 error:NULL];
        NSLog(@"json = %@", json);
    };
//    NSLog(@"Becomre");
    [call runSynchronously];
    NSLog(@"call = %@", call.responseError);
}
- (TernProject*)projectForDirectoryPath:(NSString*)path {
    if (![path length])
        return [TernProject nullProject];
    
    if ([projects objectForKey:path])
        return [projects objectForKey:path];
    
    TernProject* proj = [[TernProject alloc] init];
    proj.uuid = TernGenerateUUID();
    proj.dir = path;
    
    // This is a memory leak, albeit a very slow one, so meh
    [projects setObject:proj forKey:[path copy]];
    return proj;
}

#ifndef USES_ARC
- (void)finalize {
    dispatch_release(queue);
}
#endif


// See https://gist.github.com/fileability/505060454f4fe3615cff

@end

// Represents a tern
@implementation TernProject

// Untitled files exist in the "null project"
+ (id)nullProject {
    static dispatch_once_t onceToken;
    static TernProject* nullProject;
    dispatch_once(&onceToken, ^{
        nullProject = [[[self class] alloc] init];
    });
    return nullProject;
}

- (void)notifyDocumentOpened:(id<TernDocument>)doc {
    NSString* path = [[doc fileURL] path];
    if (![path length]) path = @"///null";
    else path = [path copy];
    
    NSString* contents = [doc stringContents];
    if ([contents length] > TERN_LENGTH_LIMIT)
        return;
    
    if (![contents length]) contents = @"";
    else contents = [contents copy];
    
    doc.ternDelta.oldContents = contents;
    
    [[TernController sharedController] sendRequestToURLPath:@"/file/opened"
                                              urlParameters:@{}
                                             postParameters:@{ @"path": path, @"document_id": [doc ternID] }
                                              fileParameter:contents
                                                    project:self
                                                   callback:nil];
}
- (void)notifyDocumentClosed:(id<TernDocument>)doc {
    NSString* path = [[doc fileURL] path];
    if (![path length]) path = @"///null";
    
    [[TernController sharedController] sendRequestToURLPath:@"/file/closed"
                                              urlParameters:@{}
                                             postParameters:@{ @"path": path, @"document_id": [doc ternID] }
                                              fileParameter:nil
                                                    project:self
                                                   callback:nil];
}
- (void)requestCompletions:(id<TernDocument>)doc atLocation:(long)cursorLocation callback:(void(^)(NSDictionary*))callback {
    
    NSString* path = [[doc fileURL] path];
    if (![path length]) path = @"///null";
    
    NSString* contents = [doc stringContents];
    if ([contents length] > TERN_LENGTH_LIMIT)
        return;
    if (![contents length]) contents = @"";
    
    //    delta_content (string)
    //    delta_offset (int)
    //    delta_length (int)
    //    full_content (string)    (may be sent INSTEAD of delta_content, delta_offset, delta_length, etc)
    
    TernDelta* deltaer = [doc ternDelta];
    NSDictionary* deltaResult = [deltaer deltaForNewContents:contents];
    BOOL sendingFullContent = [[deltaResult objectForKey:@"sending_full_content"] boolValue];
    
    NSDictionary* params = @{
        @"path": path,
        @"document_id": [doc ternID],
        
        @"cursor_position": [NSString stringWithFormat:@"%ld", cursorLocation],
    
        @"sending_full_content": sendingFullContent ? @"true" : @"false",
        @"delta_offset": sendingFullContent ? @"-1" : [deltaResult objectForKey:@"delta_offset"],
        @"delta_length": sendingFullContent ? @"-1" : [deltaResult objectForKey:@"delta_length"],
    };
    
    contents = [deltaResult objectForKey:@"FILE"];
    
    [[TernController sharedController] sendRequestToURLPath:@"/completions"
                                              urlParameters:@{}
                                             postParameters:params
                                              fileParameter:contents
                                                    project:self
                                                   callback:nil];
    deltaer.oldContents = contents;
}

@end

@implementation TernDelta : NSObject

- (NSDictionary*)deltaForNewContents:(NSString*)contents {
    
    // TODO: TernChangedRange and this are currently WAY too conservative and will resend the whole thing in cases where they could just send an empty string, or send delta_length=0
    // Support sending delta_length=0 or FILE=""
    
    NSLog(@"Before: '%@', After: '%@'", self.oldContents, contents);
    
    NSRange newUnequal = NSMakeRange(NSNotFound, 0);
    NSRange oldUnequal = TernChangedRange(self.oldContents, contents, &newUnequal);
    NSLog(@"ranges %@ | %@", NSStringFromRange(oldUnequal), NSStringFromRange(newUnequal));
    if (oldUnequal.length == 0 || oldUnequal.location == NSNotFound
        || newUnequal.length == 0 || newUnequal.location == NSNotFound)
        return @{ @"sending_full_content": @YES, @"FILE": [contents copy] };
    
    return @{
    @"sending_full_content": @NO,
    @"delta_offset": [NSString stringWithFormat:@"%lu", oldUnequal.location],
    @"delta_length": [NSString stringWithFormat:@"%lu", oldUnequal.length],
    @"FILE": [[contents substringWithRange:newUnequal] copy]
    };
}

@end

